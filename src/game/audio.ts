/* ===================== audio =====================
 * Sound scaffold. It is silent until real files are dropped into
 * public/sfx/ — sfx("hit") plays public/sfx/hit.mp3 at the current volume;
 * a file that 404s is remembered and never retried. Volume + mute persist
 * to localStorage and are edited from the Settings menu.
 *
 * Expected file names (drop as .mp3, ~short one-shots):
 *   step  hit  mob_die  boss  drop  pickup  levelup  potion  ui
 */
const KEY = "emberfall.audio.v1";

interface Cfg {
  vol: number;
  mute: boolean;
}
let cfg: Cfg = { vol: 0.7, mute: false };
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

const pool = new Map<string, HTMLAudioElement[]>();
const missing = new Set<string>();
const base = import.meta.env.BASE_URL;

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
  const a = new Audio(`${base}sfx/${name}.mp3`);
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
  sfx("step", { vol: 0.35 });
}

export function getVolume(): number {
  return cfg.vol;
}
export function isMuted(): boolean {
  return cfg.mute;
}
export function setVolume(v: number): void {
  cfg.vol = Math.max(0, Math.min(1, v));
  save();
}
export function setMuted(m: boolean): void {
  cfg.mute = m;
  save();
}
