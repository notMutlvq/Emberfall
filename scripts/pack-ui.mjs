/* Pack the CraftPix "Ui" ("Asset_1/Ui/*.png") pieces into the UI atlases
 * committed under src/assets/ — replacing the Kenney placeholder 9-slices
 * (ui-panel.png, ui-button.png, ui-button-active.png) and adding a small
 * icon atlas + inventory-cell tile, recolored to fit the game's dark-slate
 * + gold palette (the pack ships a bright green/tan parchment theme).
 *
 * Only blank, text-free pieces are used — the pack's labeled buttons
 * ("RESUME", "QUIT", ...) and bitmap font are Latin-only and stay unused;
 * all game text stays HTML/CSS in the Arabic font. See CREDITS.md.
 *
 * Recoloring: two per-pixel HSL remaps run in a <canvas> inside headless
 * Chrome (same approach as pack-env.mjs's floor/wall re-skin):
 *   - frameRecolor(): the panel/button/cell frame art. Classifies each
 *     opaque pixel by source hue into green (button fill) / tan (parchment
 *     fill) / brown (wood border), and remaps to gold accent / slate fill /
 *     slate border respectively, preserving each pixel's lightness so the
 *     original pixel-art shading (bevels, shadows) survives the swap.
 *   - glyphRecolor(): small monochrome icon glyphs (cog, heart, star, ...).
 *     Every opaque pixel is rehued to one target color per icon (semantic:
 *     heart -> blood red, star -> gold, ...) with lightness inverted+lifted
 *     so a glyph drawn dark-on-parchment reads light-on-dark-slate instead.
 *
 *   node scripts/pack-ui.mjs
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const A = "Asset_1/Ui";
const OUT = "src/assets";

for (const f of ["Buttons.png", "Inventory.png", "Icons.png"]) {
  if (!existsSync(`${A}/${f}`)) {
    console.error(`${A}/${f} missing — needs the paid CraftPix pack in Asset_1/.`);
    process.exit(1);
  }
}

// ---- crop manifest -------------------------------------------------
// [x, y, w, h] rects picked by eye from scripts/analyze-ui.mjs contact
// sheets + scripts/preview-ui.mjs zooms (see dev notes in the PR).
const BTN_NORMAL = [212, 142, 42, 13];
const BTN_ACTIVE = [260, 143, 42, 12];
const PANEL = [7, 0, 98, 101];
const PANEL_SM = [7, 112, 34, 37];
const CELL = [144, 38, 18, 19];
const CLOSEX = [197, 2, 20, 15];
const COIN = [243, 115, 10, 10];
const GEM = [260, 115, 9, 11];
const ICON = {
  cog: [3, 2, 11, 11],
  sword: [18, 2, 12, 12],
  bag: [34, 3, 12, 11],
  heart: [83, 3, 11, 11],
  star: [18, 18, 13, 12],
  check: [49, 35, 14, 14],
  xmark: [64, 35, 14, 14],
  arrowL: [66, 67, 13, 11],
  arrowR: [82, 67, 13, 11],
  coin: COIN,
  gem: GEM,
};
// icon atlas cell layout (5 cols x 2 rows @ 16px)
const ATLAS_COLS = 5, ATLAS_CELL = 16;
const ATLAS = [
  { key: "cog", kind: "frame-glyph", hue: 222, sat: 0.16 },
  { key: "sword", kind: "glyph", hue: 43, sat: 0.75 },
  { key: "bag", kind: "glyph", hue: 43, sat: 0.75 },
  { key: "heart", kind: "glyph", hue: 6, sat: 0.72 },
  { key: "star", kind: "glyph", hue: 43, sat: 0.85 },
  { key: "check", kind: "glyph", hue: 140, sat: 0.55 },
  { key: "xmark", kind: "glyph", hue: 6, sat: 0.6 },
  { key: "arrowL", kind: "frame-glyph", hue: 222, sat: 0.16 },
  { key: "arrowR", kind: "frame-glyph", hue: 222, sat: 0.16 },
  { key: "coin", kind: "keep" },
  { key: "gem", kind: "keep" },
  { key: "closex", kind: "frame", src: "inv", rect: CLOSEX },
];

const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 64, height: 64 });

const outB64 = await page.evaluate(
  async (btnSrc, invSrc, iconSrc, args) => {
    const { BTN_NORMAL, BTN_ACTIVE, PANEL, PANEL_SM, CELL, COIN, GEM, ICON, ATLAS, ATLAS_COLS, ATLAS_CELL } = args;
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const imgs = { btn: await load(btnSrc), inv: await load(invSrc), icon: await load(iconSrc) };

    // ---- HSL helpers ----
    function rgb2hsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0; const l = (max + min) / 2;
      const d = max - min;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
      }
      return [h, s, l];
    }
    function hsl2rgb(h, s, l) {
      h /= 360;
      let r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // pack green/tan/brown frame art -> gold accent / slate fill / slate border
    function frameRecolor(data) {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
        if (l > 0.94 || s < 0.08) continue; // paper highlight / near-gray: leave
        let nh, ns, nl;
        if (h >= 95 && h <= 200) { // green button fill/shadow -> gold accent
          nh = 43; ns = clamp(s * 1.3, 0.5, 0.9); nl = clamp(l + 0.03, 0, 0.85);
        } else if (h >= 0 && h <= 60 && l > 0.55) { // tan parchment fill -> slate fill
          nh = 231; ns = 0.22; nl = clamp(0.14 + ((l - 0.55) / 0.4) * 0.16, 0.1, 0.32);
        } else if (h >= 0 && h <= 60) { // brown wood border -> slate border
          nh = 231; ns = 0.26; nl = clamp(l * 0.85 + 0.06, 0.08, 0.5);
        } else {
          continue; // other hues (rare here): leave as-is
        }
        const [r, g, b] = hsl2rgb(nh, ns, nl);
        data[i] = r; data[i + 1] = g; data[i + 2] = b;
      }
    }
    // monochrome icon glyph -> single target hue, lightness inverted+lifted
    // so a mark drawn dark-on-parchment reads light-on-dark-slate.
    function glyphRecolor(data, hue, sat) {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const [, , l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
        const nl = clamp(0.55 + ((l - 0.15) / 0.25) * 0.3, 0.35, 0.9);
        const [r, g, b] = hsl2rgb(hue, sat, nl);
        data[i] = r; data[i + 1] = g; data[i + 2] = b;
      }
    }

    function cropCanvas(img, [x, y, w, h]) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(img, x, y, w, h, 0, 0, w, h);
      return [c, g];
    }
    function toPNG(c) { return c.toDataURL("image/png").split(",")[1]; }

    const out = {};

    // panel / button / button-active — frame recolor. (PANEL_SM and CELL
    // were cropped and tried too, but the fill they land on already matches
    // --panel almost exactly after recolor, and CELL's crop straddles a
    // grid divider — flat CSS reads cleaner there, so neither is emitted.)
    for (const [name, src, rect, extraDarken] of [
      ["ui-panel", imgs.inv, PANEL, 0],
      ["ui-button", imgs.btn, BTN_NORMAL, 0],
      ["ui-button-active", imgs.btn, BTN_ACTIVE, 0.72],
    ]) {
      const [c, g] = cropCanvas(src, rect);
      const id = g.getImageData(0, 0, c.width, c.height);
      frameRecolor(id.data);
      if (extraDarken) {
        for (let i = 0; i < id.data.length; i += 4) {
          if (id.data[i + 3] === 0) continue;
          id.data[i] *= extraDarken; id.data[i + 1] *= extraDarken; id.data[i + 2] *= extraDarken;
        }
      }
      g.putImageData(id, 0, 0);
      out[name] = toPNG(c);
    }

    // icon atlas
    const rows = Math.ceil(ATLAS.length / ATLAS_COLS);
    const ac = document.createElement("canvas");
    ac.width = ATLAS_COLS * ATLAS_CELL; ac.height = rows * ATLAS_CELL;
    const ag = ac.getContext("2d");
    ag.imageSmoothingEnabled = false;
    ATLAS.forEach((entry, i) => {
      const cellX = (i % ATLAS_COLS) * ATLAS_CELL, cellY = Math.floor(i / ATLAS_COLS) * ATLAS_CELL;
      const rect = entry.rect || ICON[entry.key] || [0, 0, 0, 0];
      const srcImg = entry.src === "inv" ? imgs.inv : entry.key === "coin" || entry.key === "gem" ? imgs.inv : imgs.icon;
      const [x, y, w, h] = rect;
      const [c, g] = cropCanvas(srcImg, [x, y, w, h]);
      const id = g.getImageData(0, 0, w, h);
      if (entry.kind === "glyph") glyphRecolor(id.data, entry.hue, entry.sat);
      else if (entry.kind === "frame-glyph") { glyphRecolor(id.data, entry.hue, entry.sat); }
      else if (entry.kind === "frame") frameRecolor(id.data);
      // "keep": no recolor
      g.putImageData(id, 0, 0);
      const dx = cellX + Math.round((ATLAS_CELL - w) / 2), dy = cellY + Math.round((ATLAS_CELL - h) / 2);
      ag.drawImage(c, dx, dy);
    });
    out["ui-icons"] = toPNG(ac);

    return out;
  },
  b64(`${A}/Buttons.png`), b64(`${A}/Inventory.png`), b64(`${A}/Icons.png`),
  { BTN_NORMAL, BTN_ACTIVE, PANEL, PANEL_SM, CELL, COIN, GEM, ICON, ATLAS, ATLAS_COLS, ATLAS_CELL },
);

for (const [name, data] of Object.entries(outB64)) {
  const path = `${OUT}/${name}.png`;
  writeFileSync(path, Buffer.from(data, "base64"));
  console.log(path);
}
console.log(`ui-icons.png layout (5 cols x ${Math.ceil(ATLAS.length / ATLAS_COLS)} rows, 16px cells): ${ATLAS.map((e, i) => `${i}=${e.key}`).join(", ")}`);
await browser.close();
