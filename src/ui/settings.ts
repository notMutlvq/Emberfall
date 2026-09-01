/* Settings overlay — sound, language, session controls, wipe. Reachable
 * from the main-menu cog and the in-game nav. */
import { $ } from "../game/core.ts";
import { getVolume, isMuted, setVolume, setMuted } from "../game/audio.ts";
import { getLocale, setLocale, t, type Locale } from "../i18n/index.ts";
import { clearRun, detachUser } from "../game/save.ts";
import { toast } from "../game/hud.ts";

const APP_VERSION = "0.1.0";
let onExitToMenu: (() => void) | null = null;
let onLoggedOut: (() => void) | null = null;
let wipeArmed = 0;

export function initSettings(exitToMenu: () => void, loggedOut: () => void): void {
  onExitToMenu = exitToMenu;
  onLoggedOut = loggedOut;

  $("mm-settings").addEventListener("click", openSettings);
  $("set-close").addEventListener("click", closeSettings);

  const vol = $("set-vol") as HTMLInputElement;
  vol.addEventListener("input", () => setVolume(Number(vol.value) / 100));
  const mute = $("set-mute") as HTMLInputElement;
  mute.addEventListener("change", () => setMuted(mute.checked));

  document.querySelectorAll<HTMLElement>("#set-lang [data-lang]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const l = tab.dataset.lang as Locale;
      if (l === getLocale()) return;
      setLocale(l);
      location.reload(); // lang/dir + every string are applied at boot
    });
  });

  $("set-tomenu").addEventListener("click", () => {
    closeSettings();
    onExitToMenu?.();
  });
  $("set-logout").addEventListener("click", async () => {
    closeSettings();
    detachUser();
    onLoggedOut?.();
  });
  $("set-wipe").addEventListener("click", () => {
    const now = Date.now();
    if (now - wipeArmed > 3000) {
      wipeArmed = now;
      toast(t("wipeConfirm"));
      return;
    }
    wipeArmed = 0;
    clearRun();
    try {
      localStorage.removeItem("emberfall.meta.v1");
    } catch {
      /* ignore */
    }
    toast(t("wipeDone"));
  });

  $("set-credits").textContent = t("setCredits");
  $("set-version").textContent = t("setVersion", { v: APP_VERSION });

  // reflect the active tab
  document.querySelectorAll<HTMLElement>("#set-lang [data-lang]").forEach((tab) =>
    tab.classList.toggle("on", tab.dataset.lang === getLocale()),
  );
}

/** inRun controls which session buttons show. */
export function openSettings(): void {
  const inRun = ($("nav") as HTMLElement).style.display === "grid";
  const signedIn = ($("mm-logout") as HTMLElement).style.display !== "none";
  ($("set-vol") as HTMLInputElement).value = String(Math.round(getVolume() * 100));
  ($("set-mute") as HTMLInputElement).checked = isMuted();
  ($("set-tomenu") as HTMLElement).style.display = inRun ? "block" : "none";
  ($("set-logout") as HTMLElement).style.display = signedIn ? "block" : "none";
  wipeArmed = 0;
  $("settings").classList.add("on");
}

export function closeSettings(): void {
  $("settings").classList.remove("on");
}
