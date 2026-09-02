/* Pack CraftPix effect frame folders into horizontal strips under
 * src/assets/. 10 frames each, downscaled to 96px cells.
 *   node scripts/pack-fx.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const A = "Asset_1/Effect";
const OUT = "src/assets";
const CELL = 96;

if (!existsSync(A)) {
  console.error(`${A}/ missing — needs the paid CraftPix pack.`);
  process.exit(1);
}

const jobs = [
  { dir: "Explosion", re: /^Explosion\d+\.png$/, out: "fx_fire.png" },
  { dir: "Circle_explosion", re: /\.png$/, out: "fx_burst.png" },
  { dir: "Explosion_two_colors", re: /\.png$/, out: "fx_ice.png" },
  // the cyan spark-burst impact frames — a short electric crackle at a point
  { dir: "Lightning", re: /^Lightning_spot\d+\.png$/, out: "fx_light.png" },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

for (const j of jobs) {
  const files = readdirSync(`${A}/${j.dir}`)
    .filter((f) => j.re.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const data = files.map((f) => `data:image/png;base64,${readFileSync(`${A}/${j.dir}/${f}`).toString("base64")}`);
  const W = files.length * CELL;
  await page.setViewport({ width: W, height: CELL });
  const b64 = await page.evaluate(
    async (data, cell, W) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = cell;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      for (let i = 0; i < data.length; i++) {
        const im = await new Promise((res) => {
          const x = new Image();
          x.onload = () => res(x);
          x.src = data[i];
        });
        g.drawImage(im, i * cell, 0, cell, cell);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    data,
    CELL,
    W,
  );
  writeFileSync(`${OUT}/${j.out}`, Buffer.from(b64, "base64"));
  console.log(`${OUT}/${j.out}  ${files.length}f  ${W}x${CELL}`);
}

await browser.close();
