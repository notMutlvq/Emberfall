/* ===================== assets =====================
 * Image loading, per-class hero tinting, and the canvas helpers that bake
 * tiles / icons. Rasters now live as real files under src/assets and are
 * resolved + hashed by Vite. Ported from emberfall-v9.html.
 */
import { TW, tsrc, HF, type ClassKey, type Item } from "./core.ts";

import tilesheetUrl from "../assets/tilesheet.png";
import envUrl from "../assets/env.png";
import propsUrl from "../assets/props.png";
import hero1Url from "../assets/hero1.png";
import hero2Url from "../assets/hero2.png";
import hero3Url from "../assets/hero3.png";
import bossUrl from "../assets/boss.png";
import weaponsUrl from "../assets/weapons.png";
import potionsUrl from "../assets/potions.png";

function img(src: string): HTMLImageElement {
  const im = new Image();
  im.src = src;
  return im;
}

export const SHEET = img(tilesheetUrl);
export const ENVI = img(envUrl);
export const PROPI = img(propsUrl);
export const BOSSI = img(bossUrl);
/* CraftPix Swordsman lvl1-3 atlases (see scripts/pack-hero.mjs). Tier is
 * picked from the player level — see heroTier(). */
export const HERO_TIERS: HTMLImageElement[] = [img(hero1Url), img(hero2Url), img(hero3Url)];
export const heroTier = (lv: number): number => (lv >= 15 ? 2 : lv >= 7 ? 1 : 0);
/* CraftPix 32px icon atlases (see scripts/pack-icons.mjs) */
export const WEAPONS = img(weaponsUrl); // 10x10
export const POTIONS = img(potionsUrl); // 8x6

const ALL = [SHEET, ENVI, PROPI, BOSSI, WEAPONS, POTIONS, ...HERO_TIERS];

/* per class: one tinted canvas per hero tier */
export const HEROC: Partial<Record<ClassKey, HTMLCanvasElement[]>> = {};
const TINTS: Record<ClassKey, [string, number]> = {
  warrior: ["#ff7a4a", 0.16],
  ranger: ["#6fd08d", 0.2],
  mage: ["#b48cff", 0.22],
};

function tintHero(src: HTMLImageElement, col: string, alpha: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  if (alpha) {
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = alpha;
    g.fillStyle = col;
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

export function tileCanvas(i: number, s: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = TW * s;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const [sx, sy] = tsrc(i);
  g.drawImage(SHEET, sx, sy, TW, TW, 0, 0, TW * s, TW * s);
  return c;
}

export const RINGIMG: HTMLCanvasElement = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#e0a63c";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(8, 9, 4.2, 0, 7);
  g.stroke();
  g.fillStyle = "#6fc3d9";
  g.fillRect(6, 2, 4, 3);
  return c;
})();

/* ---------- item icons ----------
 * CraftPix atlases for weapon + armor; rings stay procedural (locked
 * decision #4). Cached per uid so every item keeps a stable, varied icon.
 */
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);
// swords 0-19, bows 20-39, hammers/axes 40-59, spears/staves/wands 70-99
const WEAP_POOL = [...range(0, 60), ...range(70, 100)];
// shields
const ARMOR_POOL = [60, 61, 62, 63, 64, 65];
const RING_GEM = ["#9aa4c0", "#6fb0e6", "#ffc94d", "#e08a5c"]; // common/fine/rare/relic

function atlasCell(sheet: HTMLImageElement, idx: number, cols: number, cell: number, out: number): string {
  const c = document.createElement("canvas");
  c.width = c.height = out;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.drawImage(sheet, (idx % cols) * cell, Math.floor(idx / cols) * cell, cell, cell, 0, 0, out, out);
  return c.toDataURL();
}

const ringCache: string[] = [];
function ringIcon(rar: number): string {
  if (ringCache[rar]) return ringCache[rar];
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.lineWidth = 9;
  g.strokeStyle = "#c9a227";
  g.beginPath();
  g.arc(32, 39, 15, 0, 7);
  g.stroke();
  g.fillStyle = RING_GEM[rar] ?? RING_GEM[0];
  g.beginPath();
  g.arc(32, 17, 9, 0, 7);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "#1e2233";
  g.stroke();
  return (ringCache[rar] = c.toDataURL());
}

const iconCache = new Map<string, string>();
export function iconFor(it: Item): string {
  const key = it.slot + ":" + it.uid;
  const hit = iconCache.get(key);
  if (hit) return hit;
  let url: string;
  if (it.slot === "ring") {
    url = ringIcon(it.rar);
  } else {
    const pool = it.slot === "armor" ? ARMOR_POOL : WEAP_POOL;
    const idx = pool[(it.uid * 13 + it.ilvl) % pool.length];
    url = atlasCell(WEAPONS, idx, 10, 32, 64);
  }
  iconCache.set(key, url);
  return url;
}

export function heroPortrait(cls: ClassKey): string {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const src = HEROC[cls]?.[0] ?? HERO_TIERS[0];
  // idle-down frame 0
  g.drawImage(src, 0, 0, HF, HF, 0, 0, 64, 64);
  return c.toDataURL();
}

/* ---------- readiness ---------- */
let readyResolve: () => void;
const readyPromise = new Promise<void>((res) => {
  readyResolve = res;
});
let loaded = 0;
function assetReady(): void {
  if (++loaded < ALL.length) return;
  for (const k in TINTS) {
    const key = k as ClassKey;
    HEROC[key] = HERO_TIERS.map((im) => tintHero(im, TINTS[key][0], TINTS[key][1]));
  }
  readyResolve();
}
ALL.forEach((im) => {
  if (im.complete && im.naturalWidth) assetReady();
  else {
    im.onload = assetReady;
    im.onerror = assetReady;
  }
});

export function whenAssetsReady(): Promise<void> {
  return readyPromise;
}
