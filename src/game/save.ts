/* ===================== save =====================
 * Stage 3 persistence. Two independent slices:
 *
 *  RUN  (emberfall.run.v1)  — the durable mirror of an in-progress run, per
 *       locked decision #5: level, xp, points, taken nodes, slots, equipment,
 *       bag, gold, mats, shards, quests, cleared zones, class, name, current
 *       HP, zone index (+ the item-uid counter and run summary, which the
 *       list implies). Written on a timer and on pagehide so a reload / phone
 *       lock / dropped connection doesn't kill the run. On restore the zone
 *       is regenerated fresh and the player dropped at the entrance with the
 *       saved HP — no mid-combat freeze. Cleared when the run ends.
 *
 *  META (emberfall.meta.v1) — the stash plus best score and total runs.
 *       Outlives any single run. Always mirrored to localStorage; when a
 *       user is signed in it also syncs to Supabase `player_state`.
 *
 * localStorage can throw (private mode, quota, disabled) — every access is
 * guarded and a failure just means "no save", never a crash.
 */
import { S } from "./core.ts";
import type { GameState, Item, RunSummary } from "./core.ts";
import { fetchPlayerState, writePlayerState } from "../net/playerstate.ts";

const RUN_KEY = "emberfall.run.v1";
const META_KEY = "emberfall.meta.v1";

/* ---------- run mirror ---------- */

const RUN_FIELDS = [
  "cls", "lv", "xp", "pts", "taken", "slots", "name", "gold", "shard",
  "mats", "protect", "pots", "hp", "eq", "bag", "quests", "cleared",
  "zone", "guardUsed", "uid", "run",
] as const satisfies readonly (keyof GameState)[];

type RunField = (typeof RUN_FIELDS)[number];

type RunSave = Pick<GameState, RunField> & { v: 1 };

let runActive = false;
export function setRunActive(b: boolean): void {
  runActive = b;
}
export function isRunActive(): boolean {
  return runActive && !!S.cls;
}

function serializeRun(): RunSave {
  const out: Record<string, unknown> = { v: 1 };
  for (const k of RUN_FIELDS) out[k] = S[k];
  return out as RunSave;
}

export function saveRun(): void {
  if (!isRunActive()) return;
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(serializeRun()));
  } catch {
    /* ignore */
  }
}

export function loadRun(): RunSave | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as RunSave;
    return d && d.v === 1 && d.cls ? d : null;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSavedRun(): boolean {
  return !!loadRun();
}

/** Copy a loaded run back into S. Callers must then rebuild the zone and
 *  clamp HP against the fresh stats (see ui/menu.ts resumeRun). */
export function applyRun(d: RunSave): void {
  const s = S as unknown as Record<string, unknown>;
  for (const k of RUN_FIELDS) {
    if (d[k] !== undefined) s[k] = d[k];
  }
  S.selSlot = null;
  S.selAb = S.slots.find((x): x is string => !!x) ?? null;
  S.craftSel = null;
  S.craftMode = "reroll";
  S.auras = {};
}

/* ---------- meta (stash + best + runs) ---------- */

interface MetaSave {
  v: 1;
  stash: Item[];
  best: RunSummary | null;
  runs: number;
}

let userId: string | null = null;
let remoteBest = 0;
let pushT: ReturnType<typeof setTimeout> | undefined;

/** Best score we know about, from any source seen this session. */
export function bestScore(): number {
  return Math.max(remoteBest, S.best?.score ?? 0);
}

function readMeta(): MetaSave | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as MetaSave;
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}

function writeMeta(): void {
  try {
    const m: MetaSave = { v: 1, stash: S.stash, best: S.best, runs: S.runs };
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** Load the local meta into S. Call once at boot, before any screen shows. */
export function loadMeta(): void {
  const m = readMeta();
  if (!m) return;
  S.stash = Array.isArray(m.stash) ? m.stash : [];
  S.best = m.best ?? null;
  S.runs = m.runs ?? 0;
  if (S.best?.score) remoteBest = Math.max(remoteBest, S.best.score);
}

function remotePayload() {
  return { stash: S.stash, best_score: bestScore(), total_runs: S.runs };
}

/** Persist stash/best/runs: localStorage now, Supabase debounced. */
export function persistMeta(): void {
  writeMeta();
  if (!userId) return;
  const id = userId;
  clearTimeout(pushT);
  pushT = setTimeout(() => void writePlayerState(id, remotePayload()), 1200);
}

/** Persist immediately, awaiting the network write (used at run end, when
 *  the tab may be about to close). */
export async function persistMetaNow(): Promise<void> {
  writeMeta();
  clearTimeout(pushT);
  if (userId) await writePlayerState(userId, remotePayload());
}

/* ---------- account session ---------- */

/** Tell the save layer which account (if any) is signed in, and pull that
 *  account's state down. On a fresh account with no row yet, the local
 *  stash/best/runs are seeded up instead of being wiped. */
export async function attachUser(id: string): Promise<void> {
  userId = id;
  const remote = await fetchPlayerState(id);
  if (!remote) {
    // no row yet (or offline) — keep whatever we have and seed it
    await writePlayerState(id, remotePayload());
    writeMeta();
    return;
  }
  S.stash = remote.stash;
  S.runs = Math.max(S.runs, remote.total_runs);
  remoteBest = Math.max(remoteBest, remote.best_score);
  writeMeta();
}

/** Sign-out: drop the account link and its in-memory state so the next
 *  person on this browser doesn't inherit the stash. The local run mirror
 *  is dropped too. */
export function detachUser(): void {
  userId = null;
  remoteBest = 0;
  S.stash = [];
  S.best = null;
  S.runs = 0;
  runActive = false;
  clearRun();
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- run end ---------- */

/** Called from combat.die() after S.best / S.runs are updated. */
export function recordRunEnd(): void {
  setRunActive(false);
  clearRun();
  if (S.best?.score) remoteBest = Math.max(remoteBest, S.best.score);
  void persistMetaNow();
}
