/* Pack the CraftPix monster icons the game actually uses into
 * src/assets/mobs.png — a 32px strip. Order matches MOBS in core.ts.
 *   node scripts/pack-mobs.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DIR = "Asset_1/Monestar/Transperent";
const OUT = "src/assets/mobs.png";
const CELL = 32;

// index -> Monestar icon file. Keep in sync with core.ts MOBS.
const PICKS = [
  "Icon30", // 0 slime  — green ooze
  "Icon22", // 1 mummy  — risen dead with a blade
  "Icon38", // 2 demon  — winged imp
  "Icon44", // 3 dwarf  — gnome with a sword
  "Icon33", // 4 bat
  "Icon25", // 5 ghost  — blue wraith
  "Icon36", // 6 spider
  "Icon11", // 7 worm   — serpent
];

if (!existsSync(DIR)) {
  console.error(`${DIR}/ missing — needs the paid CraftPix pack.`);
  process.exit(1);
}

const data = PICKS.map((n) => `data:image/png;base64,${readFileSync(`${DIR}/${n}.png`).toString("base64")}`);
const W = PICKS.length * CELL;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: CELL });
const b64 = await page.evaluate(
  async (data, cell, W) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = cell;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < data.length; i++) {
      const im = await new Promise((res) => {
        const x = new Image();
        x.onload = () => res(x);
        x.src = data[i];
      });
      const s = Math.min(cell / im.width, cell / im.height, 1);
      const w = im.width * s;
      const h = im.height * s;
      g.drawImage(im, i * cell + (cell - w) / 2, (cell - h) / 2, w, h);
    }
    return c.toDataURL("image/png").split(",")[1];
  },
  data,
  CELL,
  W,
);
writeFileSync(OUT, Buffer.from(b64, "base64"));
console.log(`${OUT}  ${PICKS.length} mobs  ${W}x${CELL}`);
await browser.close();
