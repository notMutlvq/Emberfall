/* Leaderboard data access.
 *
 * Reads: `runs` select is public (RLS `runs_select_all`), so the board and
 * rank queries run straight through the anon key.
 * Writes: `runs` has no client insert policy — submitRun goes through the
 * `submit-run` edge function, which validates and inserts with the service
 * role. See supabase/functions/submit-run/index.ts.
 */
import { supabase } from "./supabase.ts";
import type { ClassKey, RunSummary } from "../game/core.ts";

export interface BoardRow {
  username: string;
  cls: string;
  level: number;
  score: number;
  date: string;
}

export type SubmitResult =
  | { ok: true; flagged: boolean }
  | { ok: false; reason: "offline" | "anon" | "error"; error?: string };

/** Post a finished run for validation + insertion. No-op when offline or
 *  signed out — the run still lives in localStorage either way. */
export async function submitRun(r: RunSummary): Promise<SubmitResult> {
  if (!supabase) return { ok: false, reason: "offline" };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: "anon" };

  const body = {
    class: r.cls,
    level: r.lv ?? 1,
    kills: r.kills,
    elites: r.elites,
    bosses: r.bosses,
    zones_cleared: r.zones,
    deepest_zone: r.deepest,
    gold: Math.max(0, Math.round(r.gold)),
    duration_ms: Math.max(0, Math.round(r.dur ?? 0)),
    score: r.score ?? 0,
  };

  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; flagged?: boolean; error?: string }>(
      "submit-run",
      { body },
    );
    if (error) return { ok: false, reason: "error", error: error.message };
    if (!data?.ok) return { ok: false, reason: "error", error: data?.error ?? "rejected" };
    return { ok: true, flagged: !!data.flagged };
  } catch (e) {
    return { ok: false, reason: "error", error: String(e) };
  }
}

interface RunRow {
  score: number;
  class: string;
  level: number;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
}

/** Top runs by score, newest-first as a tiebreak, optionally one class. */
export async function fetchTopRuns(cls: ClassKey | null, limit = 20): Promise<BoardRow[]> {
  if (!supabase) return [];
  let q = supabase
    .from("runs")
    .select("score, class, level, created_at, profiles(username)")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cls) q = q.eq("class", cls);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as RunRow[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      username: p?.username ?? "?",
      cls: r.class,
      level: r.level,
      score: r.score,
      date: r.created_at,
    };
  });
}

/** 1-based global rank for a score (count of strictly-better runs + 1). */
export async function fetchRank(score: number): Promise<number | null> {
  if (!supabase || score <= 0) return null;
  const { count, error } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .gt("score", score);
  if (error || count == null) return null;
  return count + 1;
}
