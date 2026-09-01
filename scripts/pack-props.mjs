/* Pack a curated set of CraftPix graveyard decorations
 * (Asset_1/Map/Objects_separately, shadow2 palette) into
 * src/assets/props.png — a 32px horizontal strip. Replaces the Kenney prop
 * strip. Keep the list short; buildMap() scatters these sparsely.
 *   node scripts/pack-props.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DIR = "Asset_1/Map/Objects_separately";
const OUT = "src/assets/props.png";
const CELL = 32;

// files are <Category>_shadow2_<n>.png; order = the ENV.props atlas index
const PICKS = [
  "Grave_shadow2_1", "Grave_shadow2_3", "Grave_shadow2_5", "Grave_shadow2_8", "Grave_shadow2_11",
  "Bones_shadow2_3", "Bones_shadow2_6", "Bones_shadow2_12",
  "Broken_tree_shadow2_4", "Broken_tree_shadow2_5",
  "Rock_shadow2_2", "Rock_shadow2_3",
  "Crystal_shadow2_1", "Thorn_palnt_shadow2_2",
];

if (!existsSync(DIR)) {
  console.error(`${DIR}/ missing — needs the paid CraftPix pack.`);
  process.exit(1);
}

const data = PICKS.map(
  (n) => `data:image/png;base64,${readFileSync(`${DIR}/${n}.png`).toString("base64")}`,
);

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
      // contain the sprite in a cell, bottom-anchored
      const s = Math.min(cell / im.width, cell / im.height, 1);
      const w = im.width * s;
      const h = im.height * s;
      g.drawImage(im, i * cell + (cell - w) / 2, cell - h, w, h);
    }
    return c.toDataURL("image/png").split(",")[1];
  },
  data,
  CELL,
  W,
);

writeFileSync(OUT, Buffer.from(b64, "base64"));
console.log(`${OUT}  ${PICKS.length} props  ${W}x${CELL}`);
await browser.close();
