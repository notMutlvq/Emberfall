/* ===================== boot =====================
 * loading screen -> assets -> local meta -> resolve session -> auth or menu.
 * On a live session the account's stash + best score come from Supabase;
 * offline they come from localStorage.
 */
import { whenAssetsReady } from "./game/assets.ts";
import { $, S } from "./game/core.ts";
import { buildMenu, resumeRun } from "./ui/menu.ts";
import { online } from "./net/supabase.ts";
import { currentProfile, type Profile } from "./net/auth.ts";
import { initAuth } from "./ui/auth.ts";
import { initMainMenu, showMainMenu } from "./ui/mainmenu.ts";
import { initSettings } from "./ui/settings.ts";
import { showScreen } from "./ui/screens.ts";
import { loadMeta, attachUser, detachUser, setRunActive, clearRun } from "./game/save.ts";
import { applyStaticI18n } from "./i18n/index.ts";

let profile: Profile | null = null;

// Portrait-only. Real lock needs an installed PWA / fullscreen on Android;
// elsewhere this rejects harmlessly and the CSS phone frame keeps layout sane.
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };
void (screen.orientation as LockableOrientation | undefined)?.lock?.("portrait").catch(() => {});

function toMainMenu(): void {
  ($("over") as HTMLElement).style.display = "none";
  showMainMenu(profile);
}

async function boot(): Promise<void> {
  applyStaticI18n();
  await whenAssetsReady();
  $("loading").classList.add("done");
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
  initSettings(
    () => {
      // "end run & return to menu" — abandon, don't submit
      setRunActive(false);
      clearRun();
      S.cls = null;
      toMainMenu();
    },
    () => {
      // logged out from Settings
      profile = null;
      showScreen("auth");
    },
  );
  $("btn-over-menu").addEventListener("click", toMainMenu);

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

/* Dev-only debug bridge for the visual smoke harness (scratchpad/smoke.mjs).
 * `import.meta.env.DEV` is statically false in `vite build`, so this whole
 * block is dead-code-eliminated from the production bundle. */
if (import.meta.env.DEV) {
  void (async () => {
    const core = await import("./game/core.ts");
    const state = await import("./game/state.ts");
    const combat = await import("./game/combat.ts");
    (window as unknown as { __ember: unknown }).__ember = {
      S: core.S, P: core.P, W: core.W, joy: core.joy,
      enterZone: state.enterZone, toHub: state.toHub, die: combat.die,
    };
  })();
}
