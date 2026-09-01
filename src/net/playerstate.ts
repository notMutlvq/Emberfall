/* Supabase `player_state` — the private per-account row that carries the
 * stash and meta counters between runs and across devices. Owner-only RLS
 * (see supabase/policies.sql). Pure data access: no game state is touched
 * here, the caller (game/save.ts) does the merging.
 *
 * The row is created lazily by the first upsert — there is no signup-time
 * trigger for it, unlike `profiles`.
 */
import { supabase } from "./supabase.ts";
import type { Item } from "../game/core.ts";

export interface RemoteState {
  stash: Item[];
  best_score: number;
  total_runs: number;
}

/** Read the row. `null` = offline, request failed, or no row yet. */
export async function fetchPlayerState(userId: string): Promise<RemoteState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("player_state")
      .select("stash, best_score, total_runs")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      stash: Array.isArray(data.stash) ? (data.stash as Item[]) : [],
      best_score: Number(data.best_score) || 0,
      total_runs: Number(data.total_runs) || 0,
    };
  } catch {
    return null;
  }
}

/** Upsert the row. Silent on failure — persistence is best-effort. */
export async function writePlayerState(userId: string, s: RemoteState): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("player_state").upsert(
      {
        user_id: userId,
        stash: s.stash,
        best_score: s.best_score,
        total_runs: s.total_runs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* best-effort */
  }
}
