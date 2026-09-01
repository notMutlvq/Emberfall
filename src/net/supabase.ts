/* Supabase client singleton.
 *
 * If the env vars are missing the client is null and the app runs in
 * "offline mode" — no auth screen, nothing persists — so the build stays
 * runnable for anyone who hasn't set up a Supabase project yet.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const online: boolean = !!(url && anonKey);

export const supabase: SupabaseClient | null = online
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "emberfall.auth",
      },
    })
  : null;

if (!online) {
  console.warn(
    "[emberfall] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running offline (no login, no leaderboard, no save).",
  );
}
