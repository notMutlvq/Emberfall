/* ===================== assets =====================
 * Image loading, per-class hero tinting, and the canvas helpers that bake
 * tiles / icons. Rasters now live as real files under src/assets and are
 * resolved + hashed by Vite. Ported from emberfall-v9.html.
 */
import { TW, tsrc, T, HF, type ClassKey, type Item, type Slot } from "./core.ts";

import tilesheetUrl from "../assets/tilesheet.png";
import envUrl from "../assets/env.png";
import propsUrl from "../assets/props.png";
import heroUrl from "../assets/hero.png";
import bossUrl from "../assets/boss.png";

function img(src: string): HTMLImageElement {
  const im = new Image();
  im.src = src;
  return im;
}

export const SHEET = img(tilesheetUrl);
export const ENVI = img(envUrl);
export const PROPI = img(propsUrl);
export const HEROI = img(heroUrl);
export const BOSSI = img(bossUrl);

const ALL = [SHEET, ENVI, PROPI, HEROI, BOSSI];

export const HEROC: Partial<Record<ClassKey, HTMLCanvasElement>> = {};
const TINTS: Record<ClassKey, [string, number]> = {
  warrior: ["#ff7a4a", 0.16],
  ranger: ["#6fd08d", 0.2],
  mage: ["#b48cff", 0.22],
};

function tintHero(col: string, alpha: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = HEROI.width;
  c.height = HEROI.height;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.drawImage(HEROI, 0, 0);
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

/* ---------- item icons ---------- */
const iconCache: Partial<Record<Slot, string>> = {};
export function iconFor(it: Item): string {
  const cached = iconCache[it.slot];
  if (cached) return cached;
  if (it.slot === "ring") {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(RINGIMG, 0, 0, 48, 48);
    return (iconCache.ring = c.toDataURL());
  }
  return (iconCache[it.slot] = tileCanvas(T.icon[it.slot], 3).toDataURL());
}

export function heroPortrait(cls: ClassKey): string {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.drawImage(HEROC[cls] || HEROI, 0, 0, HF, HF, 0, 0, 64, 64);
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
    HEROC[key] = tintHero(TINTS[key][0], TINTS[key][1]);
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
