/* Emberfall — run submission edge function.
 *
 * The `runs` table has NO client insert policy (see supabase/policies.sql);
 * this is the only writer, using the service-role key which bypasses RLS.
 * That keeps "POST your own score straight to the DB" off the table.
 *
 * What it actually stops, and what it doesn't — see README "Leaderboard".
 * Short version: it rejects runs that are internally impossible and flags
 * runs that are merely suspicious. A determined cheater with devtools can
 * still craft a self-consistent fake run; that's accepted for now.
 *
 * Deploy:  supabase functions deploy submit-run
 * Env (auto-provided by the platform): SUPABASE_URL, SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLASSES = ["warrior", "ranger", "mage"];
const BASE_MIN_MS = 15_000; // a level-1 death still takes a few seconds
const MIN_MS_PER_LEVEL = 6_000; // rough floor: ~6s of fighting per level
const RATE_WINDOW_MS = 30_000; // at most one accepted run per this window
const MAX_LEVEL = 60; // XP curve puts a real session far below this

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // resolve the caller from their bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const cls = String(b.class ?? "");
  const level = num(b.level);
  const kills = num(b.kills);
  const elites = num(b.elites);
  const bosses = num(b.bosses);
  const zones = num(b.zones_cleared);
  const deepest = num(b.deepest_zone);
  const gold = Math.round(num(b.gold));
  const dur = Math.round(num(b.duration_ms));
  const score = num(b.score);

  const ints = [level, kills, elites, bosses, zones, deepest];
  const all = [...ints, gold, dur, score];
  if (all.some((x) => Number.isNaN(x) || x < 0)) return json({ error: "bad fields" }, 400);
  if (!ints.every(Number.isInteger)) return json({ error: "non-integer fields" }, 400);
  if (!CLASSES.includes(cls)) return json({ error: "bad class" }, 400);

  // ---- structural impossibilities: hard reject ----
  if (level < 1 || level > MAX_LEVEL) return json({ error: "level out of range" }, 422);
  if (zones > 5 || bosses > 5) return json({ error: "zones out of range" }, 422);
  if (deepest > 4) return json({ error: "deepest out of range" }, 422);
  // a zone is only "cleared" by killing its boss — the two move together
  if (zones !== bosses) return json({ error: "zones/bosses mismatch" }, 422);

  const expected = level * 100 + kills * 6 + elites * 25 + bosses * 250 + zones * 300;
  if (score !== expected) return json({ error: "score mismatch", expected }, 422);

  // ---- merely suspicious: insert, but flag for review ----
  let flagged = false;
  const durFloor = BASE_MIN_MS + (level - 1) * MIN_MS_PER_LEVEL;
  if (dur < durFloor) flagged = true; // too fast for the level reached
  if (deepest > zones) flagged = true; // can't be deeper than you've cleared + 1... treat >cleared as odd
  if (kills > 300 + level * 200) flagged = true; // implausible kill density
  if (gold > 100_000 + kills * 4_000) flagged = true;

  const admin = createClient(url, service);

  // ---- rate limit ----
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count, error: rlErr } = await admin
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (rlErr) return json({ error: "rate check failed" }, 500);
  if ((count ?? 0) > 0) return json({ error: "slow down — one run per 30s" }, 429);

  const { error: insErr } = await admin.from("runs").insert({
    user_id: user.id,
    class: cls,
    level,
    kills,
    elites,
    bosses,
    zones_cleared: zones,
    deepest_zone: deepest,
    gold,
    duration_ms: dur,
    score,
    flagged,
  });
  if (insErr) return json({ error: insErr.message }, 500);

  return json({ ok: true, flagged });
});
