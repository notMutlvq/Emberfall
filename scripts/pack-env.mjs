/* Pack the dungeon ground + wall strip into src/assets/env.png — a 16px
 * horizontal strip read by buildMap() in src/game/zones.ts:
 *   0-3  floor  (textured flagstone + cobble — the common floor)
 *   4-5  floor detail  (flat stone / cobble variant — fillFloor stamps sparsely)
 *   6-9  wall   (dark cave-rock face; buildMap adds the drop-shadow + top rim)
 * All cells come from the CraftPix "Cemetery" pack Asset_1/Map/Ground_rocks.png.
 *
 * Also re-skins tilesheet.png cell 125 (the wall-base rubble scatter buildMap
 * stamps where a wall meets floor below) to match. The chest / anvil / gate /
 * NPC / monster / item-icon cells in tilesheet.png are left untouched — their
 * indices are hard-coded across core.ts.
 *
 *   node scripts/pack-env.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROCKS = "Asset_1/Map/Ground_rocks.png";
const ENV_OUT = "src/assets/env.png";
const TS_OUT = "src/assets/tilesheet.png";
const T = 16;

for (const f of [ROCKS, TS_OUT]) {
  if (!existsSync(f)) {
    console.error(`${f} missing — needs the paid CraftPix pack in Asset_1/.`);
    process.exit(1);
  }
}

// env.png slot -> [col,row] in 16px cells of Ground_rocks.png
const ENV = [
  [20, 22],  // 0  grey cobble            (base floor, ~72% of cells)
  [21, 22],  // 1  cobble, alt
  [22, 22],  // 2  cobble, alt
  [6, 8],    // 3  warmer tan cobble
  [6, 9],    // 4  cobble, mossy edge     (detail — fillFloor stamps ~9%)
  [7, 8],    // 5  cobble, worn            (detail)
  [8, 15],   // 6  dark rock face (wall)
  [9, 15],   // 7  dark rock face
  [5, 16],   // 8  dark rock face
  [1, 4],    // 9  dark rock face, streaked
];
const PATCH = { 125: [9, 15] }; // tilesheet cell -> Ground_rocks cell

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 256 });

const [envPng, tsPng] = await page.evaluate(
  async (rocksSrc, tsSrc, ENV, PATCH, T) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const rocks = await load(rocksSrc);
    const pick = (c, [cx, cy]) => c.drawImage(rocks, cx * T, cy * T, T, T, 0, 0, T, T);

    const ec = document.createElement("canvas");
    ec.width = ENV.length * T; ec.height = T;
    const eg = ec.getContext("2d"); eg.imageSmoothingEnabled = false;
    ENV.forEach((cell, i) => { eg.save(); eg.translate(i * T, 0); pick(eg, cell); eg.restore(); });

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
  b64(ROCKS), b64(TS_OUT), ENV, PATCH, T,
);

writeFileSync(ENV_OUT, Buffer.from(envPng, "base64"));
writeFileSync(TS_OUT, Buffer.from(tsPng, "base64"));
console.log(`${ENV_OUT}  ${ENV.length} tiles  ${ENV.length * T}x${T}`);
console.log(`${TS_OUT}  patched tiles ${Object.keys(PATCH).join(", ")}`);
await browser.close();
