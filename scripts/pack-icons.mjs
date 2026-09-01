/* Pack the CraftPix 32px icon folders into atlases committed under
 * src/assets/. Run from the repo root with Asset_1/ present:
 *   node scripts/pack-icons.mjs
 * Asset_1/ is gitignored (paid pack) so this is a one-off dev step; the
 * generated atlases ARE committed.
 */
import puppeteer from "puppeteer-core";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const A = "Asset_1";
const OUT = "src/assets";

if (!existsSync(A)) {
  console.error(`${A}/ not found — this needs the paid CraftPix pack.`);
  process.exit(1);
}

const jobs = [
  { dir: `${A}/Weapon`, re: /^icon_(\d+)\.png$/, cols: 10, cell: 32, out: `${OUT}/weapons.png` },
  { dir: `${A}/Potion/Transperent`, re: /^Icon(\d+)\.png$/, cols: 8, cell: 32, out: `${OUT}/potions.png` },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

for (const j of jobs) {
  const files = readdirSync(j.dir)
    .filter((f) => j.re.test(f))
    .sort((a, b) => Number(a.match(j.re)[1]) - Number(b.match(j.re)[1]));
  const rows = Math.ceil(files.length / j.cols);
  const w = j.cols * j.cell;
  const h = rows * j.cell;
  const data = files.map((f) => `data:image/png;base64,${readFileSync(`${j.dir}/${f}`).toString("base64")}`);

  await page.setViewport({ width: w, height: h });
  const b64 = await page.evaluate(
    async (data, cols, cell, w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      await Promise.all(
        data.map(
          (src, i) =>
            new Promise((res) => {
              const im = new Image();
              im.onload = () => {
                g.drawImage(im, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
                res();
              };
              im.onerror = res;
              im.src = src;
            }),
        ),
      );
      return c.toDataURL("image/png").split(",")[1];
    },
    data,
    j.cols,
    j.cell,
    w,
    h,
  );
  writeFileSync(j.out, Buffer.from(b64, "base64"));
  console.log(`${j.out}  ${files.length} icons  ${w}x${h}`);
}

await browser.close();
