/* Pack the dungeon ground strip from the CraftPix "Cemetery" map tiles
 * (Asset_1/Map/Water_coasts.png cobble fills + Asset_1/Map/Ground_rocks.png
 * cave rock) into src/assets/env.png — a 16px horizontal strip:
 *   0-3  floor variants  (grey flagstone + tan cobble, mixed)
 *   4-5  gravel-fleck detail floors
 *   6-9  wall tiles       (grey cave rock)
 * buildMap() reads floor idx from Z.var (0-3) and walls from
 * ENV.floors + n (6-9). See src/game/zones.ts.
 *
 * Also re-skins the handful of floor/wall cells still taken from
 * src/assets/tilesheet.png (the Kenney atlas) so they match:
 *   40      T.wall        48-51  T.floor        125  wall-base rubble
 * The chest / anvil / gate / NPC / monster tiles in tilesheet.png are
 * left untouched — their indices are hard-coded across core.ts.
 *
 *   node scripts/pack-env.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WATER = "Asset_1/Map/Water_coasts.png";
const ROCKS = "Asset_1/Map/Ground_rocks.png";
const ENV_OUT = "src/assets/env.png";
const TS_OUT = "src/assets/tilesheet.png";
const T = 16;

for (const f of [WATER, ROCKS, TS_OUT]) {
  if (!existsSync(f)) {
    console.error(`${f} missing — needs the paid CraftPix pack in Asset_1/.`);
    process.exit(1);
  }
}

// src = which sheet, [col,row] in 16px cells of that sheet
const W = "water", R = "rocks";
// env.png slot -> source cell (col,row in 16px cells of that sheet)
const ENV = [
  [W, 1, 10],  // 0  flat grey flagstone  (base floor, ~80% of cells)
  [W, 25, 10], // 1  tan cobblestone
  [R, 24, 6],  // 2  grey flagstone, lightly cracked
  [W, 8, 6],   // 3  tan cobblestone, alt
  [R, 5, 6],   // 4  grey stone (unused by fillFloor, kept in-family)
  [W, 25, 10], // 5  tan cobblestone (unused by fillFloor)
  [R, 8, 15],  // 6  dark cave rock (wall)
  [R, 9, 15],  // 7  dark cave rock
  [R, 5, 16],  // 8  dark cave rock
  [R, 6, 16],  // 9  dark cave rock
];
// tilesheet.png (12-col grid) index -> source cell
const PATCH = {
  40: [R, 5, 16],   // T.wall
  48: [W, 1, 10], 49: [W, 25, 10], 50: [R, 24, 6], 51: [W, 8, 6], // T.floor
  125: [W, 1, 9],   // wall-base rubble scatter (pebbles)
};

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 256 });

const [envPng, tsPng] = await page.evaluate(
  async (water, rocks, tsSrc, ENV, PATCH, T) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const imgs = { water: await load(water), rocks: await load(rocks) };
    const pick = (c, [src, cx, cy]) => c.drawImage(imgs[src], cx * T, cy * T, T, T, 0, 0, T, T);

    // env strip
    const ec = document.createElement("canvas");
    ec.width = ENV.length * T; ec.height = T;
    const eg = ec.getContext("2d"); eg.imageSmoothingEnabled = false;
    ENV.forEach((cell, i) => { eg.save(); eg.translate(i * T, 0); pick(eg, cell); eg.restore(); });

    // patch tilesheet in place
    const ts = await load(tsSrc);
    const tc = document.createElement("canvas");
    tc.width = ts.width; tc.height = ts.height;
    const tg = tc.getContext("2d"); tg.imageSmoothingEnabled = false;
    tg.drawImage(ts, 0, 0);
    const COLS = ts.width / T;
    for (const [idx, cell] of Object.entries(PATCH)) {
      const x = (idx % COLS) * T, y = Math.floor(idx / COLS) * T;
      tg.clearRect(x, y, T, T);
      tg.save(); tg.translate(x, y); pick(tg, cell); tg.restore();
    }
    return [ec.toDataURL("image/png").split(",")[1], tc.toDataURL("image/png").split(",")[1]];
  },
  b64(WATER), b64(ROCKS), b64(TS_OUT), ENV, PATCH, T,
);

writeFileSync(ENV_OUT, Buffer.from(envPng, "base64"));
writeFileSync(TS_OUT, Buffer.from(tsPng, "base64"));
console.log(`${ENV_OUT}  ${ENV.length} tiles  ${ENV.length * T}x${T}`);
console.log(`${TS_OUT}  patched tiles ${Object.keys(PATCH).join(", ")}`);
await browser.close();
