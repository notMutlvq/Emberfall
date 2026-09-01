/* ===================== boot =====================
 * Stage 3: assets -> local meta -> resolve session -> auth screen or main menu.
 * On a live session the account's stash + best score are pulled from Supabase;
 * offline they come from localStorage. "Resume run" appears when a run mirror
 * is on disk; "New run" always starts fresh.
 */
import { whenAssetsReady } from "./game/assets.ts";
import { $ } from "./game/core.ts";
import { buildMenu, resumeRun } from "./ui/menu.ts";
import { online } from "./net/supabase.ts";
import { currentProfile, type Profile } from "./net/auth.ts";
import { initAuth } from "./ui/auth.ts";
import { initMainMenu, showMainMenu } from "./ui/mainmenu.ts";
import { showScreen } from "./ui/screens.ts";
import { loadMeta, attachUser, detachUser } from "./game/save.ts";
import { applyStaticI18n } from "./i18n/index.ts";

let profile: Profile | null = null;

// Portrait-only. Real lock needs an installed PWA / fullscreen on Android;
// elsewhere this rejects harmlessly and the CSS phone frame keeps layout sane.
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };
void (screen.orientation as LockableOrientation | undefined)?.lock?.("portrait").catch(() => {});

async function boot(): Promise<void> {
  applyStaticI18n();
  await whenAssetsReady();
  loadMeta();
  buildMenu();

  initAuth(async (p) => {
    profile = p;
    await attachUser(p.id);
    showMainMenu(profile);
  });
  initMainMenu(
    () => showScreen("pick"), // New run
    () => {
      // logged out
      detachUser();
      profile = null;
      showScreen("auth");
    },
    () => resumeRun(), // Resume run
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
  if (profile) {
    await attachUser(profile.id);
    showMainMenu(profile);
  } else {
    showScreen("auth");
  }
}

void boot();
