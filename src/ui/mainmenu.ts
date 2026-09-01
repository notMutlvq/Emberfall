/* Main menu shell. Stage 2: username + New run + Log out. The leaderboard
 * panel is a placeholder until stage 4 fills it.
 */
import { $ } from "../game/core.ts";
import { online } from "../net/supabase.ts";
import { signOut, type Profile } from "../net/auth.ts";
import { showScreen } from "./screens.ts";

export function initMainMenu(onNewRun: () => void, onLoggedOut: () => void): void {
  $("mm-newrun").addEventListener("click", onNewRun);
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
  showScreen("menu");
}
