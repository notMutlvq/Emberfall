/* ===================== render =====================
 * Canvas drawing: camera, tilemap blit, entities, particles, minimap.
 * Ported verbatim from emberfall-v9.html.
 */
import { S, P, W, $, clamp, tsrc, TW, ANIM, T, ELCOL, type ClassKey } from "./core.ts";
import { SHEET, HEROC, HERO_TIERS, heroTier, BOSSI, RINGIMG, FX_STRIPS, FX_CELL } from "./assets.ts";
import { abById, abMods } from "./abilities.ts";

const cv = $("cv") as HTMLCanvasElement;
const ctx = cv.getContext("2d")!;
let TS = 36;

export function resize(): void {
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width);
  cv.height = Math.round(r.height);
  TS = Math.round(r.width / 11);
}
addEventListener("resize", resize);

function ent(i: number, cx: number, cy: number, sz: number, flip: boolean): void {
  const [sx, sy] = tsrc(i);
  ctx.save();
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(SHEET, sx, sy, TW, TW, -sz / 2, -sz * 0.92, sz, sz);
  ctx.restore();
}

function drawHero(cx: number, cy: number, size: number): void {
  const sheets = HEROC[S.cls as ClassKey] ?? HERO_TIERS;
  const img = sheets[heroTier(S.lv)] ?? sheets[0];
  const A = ANIM[P.st];
  const sx = P.fi * 64;
  const sy = (A.row * 4 + P.dir) * 64;
  ctx.drawImage(img, sx, sy, 64, 64, cx - size / 2, cy - size * 0.81, size, size);
}

function drawItem(slot: "weapon" | "armor" | "ring", cx: number, cy: number, sz: number): void {
  if (slot === "ring") {
    ctx.drawImage(RINGIMG, cx - sz / 2, cy - sz * 0.92, sz, sz);
    return;
  }
  ent(T.icon[slot], cx, cy, sz, false);
}

export function draw(): void {
  const Z = W.Z;
  const w = cv.width;
  const h = cv.height;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, w, h);
  const mw = Z.W * TS;
  const mh = Z.H * TS;
  let camx = P.x * TS - w / 2;
  let camy = P.y * TS - h / 2;
  camx = mw > w ? clamp(camx, 0, mw - w) : (mw - w) / 2;
  camy = mh > h ? clamp(camy, 0, mh - h) : (mh - h) / 2;
  if (Z.map) {
    const s = TW / TS;
    ctx.drawImage(Z.map, camx * s, camy * s, w * s, h * s, 0, 0, w, h);
  }
  if (!Z.hub) {
    ctx.fillStyle = "rgba(7,8,11,.26)";
    ctx.fillRect(0, 0, w, h);
  }
  const SX = (x: number) => Math.round(x * TS - camx);
  const SY = (y: number) => Math.round(y * TS - camy);
  const vis = (x: number, y: number, pad?: number) => {
    const px = x * TS - camx;
    const py = y * TS - camy;
    return px > -(pad || 60) && px < w + (pad || 60) && py > -(pad || 90) && py < h + (pad || 60);
  };
  (Z.objs || []).forEach((o) => {
    if (!vis(o.x, o.y)) return;
    if (o.t === "gate") {
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(performance.now() / 300);
      ent(T.gate, SX(o.x), SY(o.y), TS * 1.2, false);
      ctx.globalAlpha = 1;
      return;
    }
    const ti = o.t === "chest" ? (o.used ? T.chestOpen : T.chest) : o.t === "stash" ? T.stash : o.t === "anvil" ? T.anvil : o.tile!;
    ent(ti, SX(o.x), SY(o.y), TS * 1.05, false);
    if (!o.used) {
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(performance.now() / 400);
      ctx.fillStyle = "#e0a63c";
      ctx.fillRect(SX(o.x) - 2, SY(o.y) - TS * 1.3, 4, 4);
      ctx.globalAlpha = 1;
    }
  });
  if (Z.portal && vis(Z.portal.x, Z.portal.y)) {
    const t = performance.now() / 300;
    for (let i = 3; i >= 0; i--) {
      ctx.globalAlpha = 0.22 + 0.14 * Math.sin(t + i);
      ctx.fillStyle = "#5f8fc0";
      ctx.beginPath();
      ctx.ellipse(SX(Z.portal.x), SY(Z.portal.y) - TS * 0.3, TS * 0.3 * (1 + i * 0.13), TS * 0.5 * (1 + i * 0.13), 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  Z.loot.forEach((l) => {
    if (!vis(l.x, l.y)) return;
    const bob = Math.sin(performance.now() / 300 + l.b) * 3;
    const col = l.pot ? "#5f9a6a" : ["#9aa0b5", "#5f8fc0", "#c9a227", "#b0603f"][l.item!.rar];
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(SX(l.x), SY(l.y), TS * 0.3, TS * 0.15, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (l.pot) ent(T.potion, SX(l.x), SY(l.y) + bob - TS * 0.15, TS * 0.62, false);
    else drawItem(l.item!.slot, SX(l.x), SY(l.y) + bob - TS * 0.15, TS * 0.62);
  });
  for (const id in S.auras)
    if (S.auras[id] > 0) {
      const ab = abById(id);
      if (!ab || !ab.r) continue;
      const r = ab.r * (1 + abMods(ab).rad / 100);
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(performance.now() / 200);
      ctx.fillStyle = ELCOL[ab.el];
      ctx.beginPath();
      ctx.arc(SX(P.x), SY(P.y) - TS * 0.3, r * TS, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  Z.fx.forEach((f) => {
    if (f.ground) {
      const p = 1 - f.t / 0.6;
      ctx.globalAlpha = 0.55 * (1 - p * 0.4);
      ctx.strokeStyle = f.c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(SX(f.x), SY(f.y), f.r! * TS * (0.4 + p * 0.6), 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (f.ring) {
      ctx.globalAlpha = (f.t / 0.3) * 0.6;
      ctx.strokeStyle = f.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(SX(f.x), SY(f.y) - TS * 0.3, f.ring * TS * (1.3 - (f.t / 0.3) * 0.3), 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  for (const m of Z.mobs) {
    if (!vis(m.x, m.y, 110)) continue;
    if (m.boss && m.tele > 0) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(performance.now() / 60);
      ctx.strokeStyle = "#c0453c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(SX(m.slamX!), SY(m.slamY!), 2.6 * TS, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const sz = TS * (m.boss ? 2 : m.elite ? 1.35 : 1);
    const bob = m.agro ? Math.abs(Math.sin(m.anim)) * 2 : 0;
    if (m.elite && !m.boss) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#c9a227";
      ctx.beginPath();
      ctx.ellipse(SX(m.x), SY(m.y), sz * 0.42, sz * 0.2, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (m.chill > 0) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#6fc3d9";
      ctx.fillRect(SX(m.x) - sz / 2, SY(m.y) - sz, sz, sz);
      ctx.globalAlpha = 1;
    }
    if (m.boss) ctx.drawImage(BOSSI, SX(m.x) - sz * 0.85, SY(m.y) - sz * 1.5 - bob, sz * 1.7, sz * 1.7);
    else ent(m.tile, SX(m.x), SY(m.y) - bob, sz, m.flip);
    if (m.burn > 0) {
      ctx.fillStyle = "rgba(224,122,60,.6)";
      for (let i = 0; i < 3; i++) ctx.fillRect(SX(m.x) - 7 + i * 6, SY(m.y) - sz * 0.6 - Math.random() * 9, 2, 4);
    }
    if (m.hp < m.max || m.boss) {
      const bw = m.boss ? TS * 1.9 : TS * 0.85;
      const bx = SX(m.x) - bw / 2;
      const by = SY(m.y) - sz * 0.95;
      ctx.fillStyle = "#000";
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = m.boss ? "#c0453c" : m.elite ? "#c9a227" : "#8a4a44";
      ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.max), 3);
    }
  }
  Z.proj.forEach((p) => {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(SX(p.x), SY(p.y), 3.5, 0, 7);
    ctx.fill();
  });
  Z.mproj.forEach((p) => {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(SX(p.x), SY(p.y), 4, 0, 7);
    ctx.fill();
  });
  if (P.hit > 0) ctx.globalAlpha = 0.55 + Math.random() * 0.45;
  if (P.inv > 0) ctx.globalAlpha = 0.5;
  drawHero(SX(P.x), SY(P.y), TS * 2.5);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  Z.fx.forEach((f) => {
    if (f.anim) {
      const strip = FX_STRIPS[f.anim];
      if (strip) {
        const dur = f.animDur ?? 0.5;
        const fr = Math.min(strip.n - 1, Math.max(0, Math.floor((1 - f.t / dur) * strip.n)));
        const sz = (f.animScale ?? 2) * TS;
        ctx.drawImage(strip.img, fr * FX_CELL, 0, FX_CELL, FX_CELL, SX(f.x) - sz / 2, SY(f.y) - sz * 0.62, sz, sz);
      }
    }
    if (f.slash) {
      ctx.globalAlpha = f.t / 0.15;
      ctx.strokeStyle = f.c;
      ctx.beginPath();
      ctx.arc(SX(f.x), SY(f.y) - TS * 0.3, TS * 0.5, -0.9, 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (f.line) {
      ctx.globalAlpha = f.t / 0.25;
      ctx.strokeStyle = f.c;
      ctx.beginPath();
      ctx.moveTo(SX(f.x), SY(f.y) - TS * 0.3);
      ctx.lineTo(SX(f.line[0]), SY(f.line[1]) - TS * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  ctx.font = "bold 13px ui-monospace,monospace";
  ctx.textAlign = "center";
  Z.fx.forEach((f) => {
    if (f.v === undefined) return;
    ctx.globalAlpha = Math.min(1, f.t * 2);
    ctx.fillStyle = f.c;
    ctx.fillText(String(f.v), SX(f.x), SY(f.y));
  });
  ctx.globalAlpha = 1;
  mini(w);
}

function mini(w: number): void {
  const Z = W.Z;
  const m = 60;
  const pad = 8;
  const sx = w - m - pad;
  const sy = pad + 64;
  const sc = m / Math.max(Z.W, Z.H);
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#07080b";
  ctx.fillRect(sx, sy, m, m);
  ctx.fillStyle = "#2b3040";
  Z.rooms.forEach((r) => ctx.fillRect(sx + r.x * sc, sy + r.y * sc, r.w * sc, r.h * sc));
  for (const mo of Z.mobs) {
    if (mo.boss) {
      ctx.fillStyle = "#c0453c";
      ctx.fillRect(sx + mo.x * sc - 2, sy + mo.y * sc - 2, 4, 4);
    } else if (mo.elite) {
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(sx + mo.x * sc - 1, sy + mo.y * sc - 1, 2, 2);
    } else {
      ctx.fillStyle = "#5a2f2c";
      ctx.fillRect(sx + mo.x * sc, sy + mo.y * sc, 1.5, 1.5);
    }
  }
  (Z.objs || []).forEach((o) => {
    if (o.used) return;
    if (o.t === "chest" && !Z.showChest && !Z.hub) return;
    ctx.fillStyle = o.t === "chest" ? "#e0a63c" : o.t === "npc" ? "#c9a227" : "#5f8fc0";
    ctx.fillRect(sx + o.x * sc - 1, sy + o.y * sc - 1, 3, 3);
  });
  if (Z.portal) {
    ctx.fillStyle = "#5f8fc0";
    ctx.fillRect(sx + Z.portal.x * sc - 1, sy + Z.portal.y * sc - 1, 3, 3);
  }
  ctx.fillStyle = "#e8e4d6";
  ctx.fillRect(sx + P.x * sc - 1, sy + P.y * sc - 1, 3, 3);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#343a4f";
  ctx.strokeRect(sx + 0.5, sy + 0.5, m, m);
}
