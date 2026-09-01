/* ===================== boot =====================
 * Stage 2: assets -> resolve session -> auth screen or main menu.
 * "New run" from the menu drops into the class-pick screen, then the game.
 * Offline (no Supabase env) skips auth entirely.
 */
import { whenAssetsReady } from "./game/assets.ts";
import { $ } from "./game/core.ts";
import { buildMenu } from "./ui/menu.ts";
import { online } from "./net/supabase.ts";
import { currentProfile, type Profile } from "./net/auth.ts";
import { initAuth } from "./ui/auth.ts";
import { initMainMenu, showMainMenu } from "./ui/mainmenu.ts";
import { showScreen } from "./ui/screens.ts";

let profile: Profile | null = null;

async function boot(): Promise<void> {
  await whenAssetsReady();
  buildMenu();

  initAuth((p) => {
    profile = p;
    showMainMenu(profile);
  });
  initMainMenu(
    () => showScreen("pick"), // New run
    () => showScreen("auth"), // logged out
  );
  $("btn-over-menu").addEventListener("click", () => {
    ($("over") as HTMLElement).style.display = "none";
    showMainMenu(profile);
  });

  if (!online) {
    showMainMenu(null);
    return;
  }
  profile = await currentProfile();
  if (profile) showMainMenu(profile);
  else showScreen("auth");
}

void boot();
