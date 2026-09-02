/* ===================== audio =====================
 * One-shot SFX + a single looping music bed. Both degrade to silence when a
 * file is missing (404 is remembered, never retried) so the game runs fine
 * with public/sfx or public/music empty. Volume / mute / music-volume persist
 * to localStorage and are edited from the Settings menu.
 *
 * SFX are short .ogg one-shots in public/sfx/ (Kenney CC0 — see CREDITS.md):
 *   step hit mob_die boss drop pickup levelup potion ui ability
 * Music tracks in public/music/ (keyed name -> real filename below).
 */
const KEY = "emberfall.audio.v1";

interface Cfg {
  vol: number;
  mute: boolean;
  musicVol: number;
}
let cfg: Cfg = { vol: 0.7, mute: false, musicVol: 0.5 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) cfg = { ...cfg, ...(JSON.parse(raw) as Partial<Cfg>) };
} catch {
  /* ignore */
}
function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

const base = import.meta.env.BASE_URL;

/* ---------- one-shots ---------- */
const pool = new Map<string, HTMLAudioElement[]>();
const missing = new Set<string>();

function grab(name: string): HTMLAudioElement | null {
  if (missing.has(name)) return null;
  let list = pool.get(name);
  if (!list) {
    list = [];
    pool.set(name, list);
  }
  const free = list.find((a) => a.paused || a.ended);
  if (free) return free;
  if (list.length >= 4) return null;
  const a = new Audio(`${base}sfx/${name}.ogg`);
  a.preload = "auto";
  a.addEventListener("error", () => missing.add(name), { once: true });
  list.push(a);
  return a;
}

/** Play a one-shot. Cheap no-op when muted, at zero volume, or file absent. */
export function sfx(name: string, opts?: { vol?: number }): void {
  if (cfg.mute || cfg.vol <= 0) return;
  const a = grab(name);
  if (!a) return;
  a.volume = Math.max(0, Math.min(1, cfg.vol * (opts?.vol ?? 1)));
  try {
    a.currentTime = 0;
  } catch {
    /* not yet loaded */
  }
  void a.play().catch(() => {});
}

/* footsteps: rate-limited so a moving player triggers ~3/s, not every frame */
let stepT = 0;
export function stepSound(now: number): void {
  if (now - stepT < 300) return;
  stepT = now;
  sfx("step", { vol: 0.3 });
}

/* rate-limit for the UI tap click so a fast double-tap doesn't machine-gun */
let uiT = 0;
export function uiClick(): void {
  const now = performance.now();
  if (now - uiT < 60) return;
  uiT = now;
  sfx("ui", { vol: 0.4 });
}

/* ---------- music bed ---------- */
const TRACKS: Record<string, string> = {
  camp: "music/camp.mp3",
  dungeon: "music/dungeon.ogg",
};
let musicEl: HTMLAudioElement | null = null;
let musicKey = "";
let fadeTimer: ReturnType<typeof setInterval> | undefined;

function musicTarget(): number {
  return cfg.mute ? 0 : Math.max(0, Math.min(1, cfg.musicVol));
}

function fadeTo(target: number, done?: () => void): void {
  clearInterval(fadeTimer);
  const el = musicEl;
  if (!el) return;
  fadeTimer = setInterval(() => {
    if (!musicEl || musicEl !== el) return clearInterval(fadeTimer);
    const d = target - el.volume;
    if (Math.abs(d) < 0.04) {
      el.volume = target;
      clearInterval(fadeTimer);
      done?.();
    } else {
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(d) * 0.04));
    }
  }, 40);
}

/** Switch the looping music bed. `null` fades out and stops. */
export function music(track: string | null): void {
  if (track === musicKey) {
    if (musicEl) fadeTo(musicTarget());
    return;
  }
  musicKey = track ?? "";
  const old = musicEl;
  if (old) fadeTo(0, () => old.pause());
  const src = track ? TRACKS[track] : undefined;
  if (!src) {
    musicEl = null;
    return;
  }
  const el = new Audio(`${base}${src}`);
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  el.addEventListener("error", () => {}, { once: true }); // missing file: stay silent
  musicEl = el;
  void el.play().then(() => fadeTo(musicTarget())).catch(() => {
    /* autoplay blocked until first user gesture — retried on next music() call */
  });
}

/** Nudge the current track's volume to match cfg (after a settings change). */
function refreshMusic(): void {
  if (musicEl) fadeTo(musicTarget());
}

/* ---------- settings API ---------- */
export function getVolume(): number {
  return cfg.vol;
}
export function isMuted(): boolean {
  return cfg.mute;
}
export function getMusicVolume(): number {
  return cfg.musicVol;
}
export function setVolume(v: number): void {
  cfg.vol = Math.max(0, Math.min(1, v));
  save();
}
export function setMuted(m: boolean): void {
  cfg.mute = m;
  save();
  refreshMusic();
}
export function setMusicVolume(v: number): void {
  cfg.musicVol = Math.max(0, Math.min(1, v));
  save();
  refreshMusic();
}
