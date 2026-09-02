/* Build src/assets/hero1.png .. hero3.png from the paid CraftPix
 * "Swordsman lvl1-3" sheets (Asset_1/Swordsman_lvlN/With_shadow). Each is a
 * 512x768 64px atlas, 12 rows:
 *   rows 0-3  idle   (down, left, right, up)   —  4 frames (up dir is short)
 *   rows 4-7  walk   (down, left, right, up)   —  6 frames
 *   rows 8-11 attack (down, left, right, up)   —  8 frames
 * The Swordsman sheets are already ordered [down, left, right, up] — same as
 * the game's dir index (see P.dir in combat.ts) — so SRC_ROW_ORDER is the
 * identity. (It used to be [2,1,0,3] on the wrong assumption the source was
 * [right,left,down,up]; that swapped the down/right rows, which is why
 * moving right showed the down-facing sprite and vice versa — left/up were
 * untouched since those two positions happen to coincide either way.)
 * drawHero() picks the tier from the player level (1-6 / 7-14 / 15+).
 *   node scripts/pack-hero.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "src/assets";
const SRC_ROW_ORDER = [0, 1, 2, 3]; // swordsman row -> game [down,left,right,up] (identity)
const CELL = 64;
const W = 8 * CELL;
const H = 12 * CELL;

const anims = [
  { name: "Idle", frames: 4, destRow: 0, cap: true },
  { name: "Walk", frames: 6, destRow: 4, cap: true },
  { name: "attack", frames: 8, destRow: 8, cap: false },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

for (const tier of [1, 2, 3]) {
  const dir = `Asset_1/Swordsman_lvl${tier}/With_shadow`;
  if (!existsSync(dir)) {
    console.error(`${dir}/ missing — needs the paid CraftPix pack.`);
    process.exit(1);
  }
  const sheets = anims.map((a) => ({
    ...a,
    data: `data:image/png;base64,${readFileSync(
      `${dir}/Swordsman_lvl${tier}_${a.name}_with_shadow.png`,
    ).toString("base64")}`,
  }));

  const b64 = await page.evaluate(
    async (sheets, order, cell, W, H) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      for (const s of sheets) {
        const im = await new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = s.data;
        });
        for (let d = 0; d < 4; d++) {
          for (let f = 0; f < s.frames; f++) {
            g.drawImage(im, f * cell, order[d] * cell, cell, cell, f * cell, (s.destRow + d) * cell, cell, cell);
          }
        }
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    sheets,
    SRC_ROW_ORDER,
    CELL,
    W,
    H,
  );
  writeFileSync(`${OUT}/hero${tier}.png`, Buffer.from(b64, "base64"));
  console.log(`${OUT}/hero${tier}.png  ${W}x${H}`);
}

await browser.close();
