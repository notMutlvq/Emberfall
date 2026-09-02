/* Patch the hub/dungeon object cells in src/assets/tilesheet.png (chest,
 * stash, anvil, gate) in place from the CraftPix "All Tileset" nature/camp
 * pack (Asset_1/Tileset/All Tileset/16x16.png) — replaces the Kenney Tiny
 * Dungeon sprites at those cells with single-16px-cell picks from the new
 * pack: a treasure chest (closed/ajar), a drawstring sack (stash), a lit
 * campfire (anvil/forge), and a dark pit (dungeon gate). Everything else in
 * tilesheet.png (floor/wall — see pack-env.mjs — chest/anvil/stash/gate
 * indices themselves, monster tiles, NPC portraits) is untouched, so no
 * core.ts index changes are needed.
 *
 *   node scripts/pack-tileset-objects.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SRC = "Asset_1/Tileset/All Tileset/16x16.png";
const TS_OUT = "src/assets/tilesheet.png";
const T = 16;

for (const f of [SRC, TS_OUT]) {
  if (!existsSync(f)) {
    console.error(`${f} missing — needs the paid CraftPix pack in Asset_1/.`);
    process.exit(1);
  }
}

// tilesheet.png index (12-col grid, see core.ts's T{}) -> source [col,row] in
// 16px cells of the "All Tileset" sheet.
const PATCH = {
  90: [1, 0], // T.chest      — closed chest
  89: [2, 0], // T.chestOpen  — chest ajar (lock + red interior lip)
  92: [9, 8], // T.stash      — drawstring sack
  74: [11, 4], // T.anvil      — lit campfire (forge fire)
  41: [8, 4], // T.gate       — dark pit (dungeon descent)
  72: [7, 4], // T.table      — tree stump
};

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 256 });

const tsPng = await page.evaluate(
  async (srcData, tsData, PATCH, T) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const src = await load(srcData);
    const ts = await load(tsData);
    const c = document.createElement("canvas");
    c.width = ts.width; c.height = ts.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(ts, 0, 0);
    const COLS = ts.width / T;
    for (const [idx, [cx, cy]] of Object.entries(PATCH)) {
      const x = (idx % COLS) * T, y = Math.floor(idx / COLS) * T;
      g.clearRect(x, y, T, T);
      g.drawImage(src, cx * T, cy * T, T, T, x, y, T, T);
    }
    return c.toDataURL("image/png").split(",")[1];
  },
  b64(SRC), b64(TS_OUT), PATCH, T,
);

writeFileSync(TS_OUT, Buffer.from(tsPng, "base64"));
console.log(`${TS_OUT}  patched tiles ${Object.keys(PATCH).join(", ")}`);
await browser.close();
