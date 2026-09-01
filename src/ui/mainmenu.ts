/* Main menu shell. Stage 3: username, Resume run (when a run mirror is on
 * disk), New run, best score, Log out. The full leaderboard lands in stage 4.
 */
import { $ } from "../game/core.ts";
import { online } from "../net/supabase.ts";
import { signOut, type Profile } from "../net/auth.ts";
import { hasSavedRun, bestScore } from "../game/save.ts";
import { showScreen } from "./screens.ts";

export function initMainMenu(onNewRun: () => void, onLoggedOut: () => void, onResume: () => void): void {
  $("mm-newrun").addEventListener("click", onNewRun);
  $("mm-resume").addEventListener("click", onResume);
  $("mm-logout").addEventListener("click", async () => {
    ($("mm-logout") as HTMLButtonElement).disabled = true;
    await signOut();
    ($("mm-logout") as HTMLButtonElement).disabled = false;
    onLoggedOut();
  });
}

export function showMainMenu(p: Profile | null): void {
  $("mm-user").textContent = p ? `— ${p.username} —` : "— offline —";
  ($("mm-logout") as HTMLElement).style.display = online && p ? "block" : "none";
  ($("mm-resume") as HTMLElement).style.display = hasSavedRun() ? "block" : "none";

  const best = bestScore();
  $("mm-board").textContent = best
    ? `Best score ${best}` + (p ? "" : " (this device)")
    : "Top runs will appear here once the leaderboard ships.";

  showScreen("menu");
}
