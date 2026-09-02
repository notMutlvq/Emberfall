/* ===================== zones =====================
 * Procedural hub + dungeon generation, tilemap baking, mob spawning.
 * Ported verbatim from emberfall-v9.html.
 */
import {
  S, P, W, rnd, pick, clamp, ENV, TW, tsrc,
  CHARS, MOBS, ZONES,
  type Mob, type Room, type ZoneDef,
} from "./core.ts";
import { SHEET, ENVI, PROPI } from "./assets.ts";

function fillFloor(w: number, h: number, _hub: boolean): number[][] {
  // env.png 0-3 are cobble variants (the common floor), 4-5 are detail
  // (worn flagstone / cracked cobble) stamped sparsely so the ground reads
  // as textured stone rather than one flat colour.
  const v = Array.from({ length: h }, () => new Array<number>(w).fill(0));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = Math.random();
      v[y][x] = r < 0.6 ? 0 : r < 0.84 ? rnd(1, 3) : r < 0.93 ? 4 : 5;
    }
  return v;
}

const PROP_COMMON = 14; // props.png 0..13 are the common small props, 14+ landmarks
const drawProp = (g: CanvasRenderingContext2D, idx: number, x: number, y: number): void =>
  g.drawImage(PROPI, idx * 32, 0, 32, 32, x * TW - 8, y * TW - 18, 32, 32);

export function buildMap(): void {
  const Z = W.Z;
  const Wd = Z.W;
  const Hd = Z.H;
  const c = document.createElement("canvas");
  c.width = Wd * TW;
  c.height = Hd * TW;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;

  const isWall = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= Wd || y >= Hd || Z.g[y][x] === 1;

  // 1. base tile blit — floor from Z.var, walls hashed across env 6-9
  for (let y = 0; y < Hd; y++)
    for (let x = 0; x < Wd; x++) {
      const idx = Z.g[y][x] === 1 ? ENV.floors + ((x * 7 + y * 13) % ENV.walls) : Z.var[y][x];
      g.drawImage(ENVI, idx * 16, 0, 16, 16, x * TW, y * TW, TW, TW);
    }

  // 2. wall depth — lit lip on the top edge, darkened foot on the bottom face
  for (let y = 0; y < Hd; y++)
    for (let x = 0; x < Wd; x++) {
      if (Z.g[y][x] !== 1) continue;
      const px = x * TW;
      const py = y * TW;
      if (!isWall(x, y - 1)) {
        g.fillStyle = "rgba(126,130,158,.45)";
        g.fillRect(px, py, TW, 2);
        g.fillStyle = "rgba(0,0,0,.22)";
        g.fillRect(px, py + 2, TW, 2);
      }
      if (!isWall(x, y + 1)) {
        const grd = g.createLinearGradient(0, py + TW * 0.35, 0, py + TW);
        grd.addColorStop(0, "rgba(0,0,0,0)");
        grd.addColorStop(1, "rgba(0,0,0,.45)");
        g.fillStyle = grd;
        g.fillRect(px, py + TW * 0.35, TW, TW * 0.65);
      }
    }

  // 3. drop shadow cast onto the floor by walls above / to the left
  for (let y = 0; y < Hd; y++)
    for (let x = 0; x < Wd; x++) {
      if (Z.g[y][x] !== 0) continue;
      const px = x * TW;
      const py = y * TW;
      if (isWall(x, y - 1)) {
        const grd = g.createLinearGradient(0, py, 0, py + TW * 0.75);
        grd.addColorStop(0, "rgba(0,0,0,.42)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd;
        g.fillRect(px, py, TW, TW * 0.75);
      }
      if (isWall(x - 1, y)) {
        const grd = g.createLinearGradient(px, 0, px + TW * 0.6, 0);
        grd.addColorStop(0, "rgba(0,0,0,.3)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd;
        g.fillRect(px, py, TW * 0.6, TW);
      }
    }

  // 4. rubble piled where a wall foot meets open floor
  for (let y = 1; y < Hd - 1; y++)
    for (let x = 0; x < Wd; x++)
      if (Z.g[y][x] === 1 && Z.g[y + 1][x] === 0 && Math.random() < 0.05) {
        const [sx, sy] = tsrc(125);
        g.drawImage(SHEET, sx, sy, TW, TW, x * TW, y * TW + TW * 0.55, TW, TW * 0.8);
      }

  // 5. graveyard dressing — grave plots + scattered props, hugging the walls
  const spawnX = Math.round(P.x);
  const spawnY = Math.round(P.y);
  (Z.rooms || []).forEach((r) => {
    const inFloor = (x: number, y: number): boolean =>
      y >= 0 && y < Hd && x >= 0 && x < Wd && Z.g[y][x] === 0 &&
      (Math.abs(x - spawnX) > 3 || Math.abs(y - spawnY) > 3);

    if (!Z.hub && Math.random() < 0.42) {
      // a row of headstones tucked against one wall
      const gy = Math.random() < 0.5 ? r.y + 2 : r.y + r.h - 3;
      const gx0 = rnd(r.x + 2, Math.max(r.x + 2, r.x + r.w - 5));
      for (let i = 0, n = rnd(2, 4); i < n; i++) if (inFloor(gx0 + i, gy)) drawProp(g, rnd(0, 5), gx0 + i, gy);
    }

    const n = clamp(Math.round((r.w * r.h) / (Z.hub ? 150 : 40)), Z.hub ? 1 : 3, Z.hub ? 3 : 9);
    for (let i = 0; i < n; i++) {
      const x = rnd(r.x + 1, r.x + r.w - 2);
      const y = rnd(r.y + 1, r.y + r.h - 2);
      const edge = x <= r.x + 2 || x >= r.x + r.w - 3 || y <= r.y + 2 || y >= r.y + r.h - 3;
      if (!inFloor(x, y) || (!edge && Math.random() < 0.55)) continue;
      const idx = Z.hub
        ? pick([10, 11, 15, 19, 20]) // camp: rocks + a dead tree, no graves
        : edge && Math.random() < 0.22
          ? rnd(PROP_COMMON, ENV.props - 1)
          : rnd(0, PROP_COMMON - 1);
      drawProp(g, idx, x, y);
    }
  });

  // 6. per-zone colour wash so the five zones read distinct
  const tint = (Z.d as ZoneDef).tint;
  if (tint) {
    g.save();
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = tint[3];
    g.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
    g.fillRect(0, 0, c.width, c.height);
    g.restore();
  }

  Z.map = c;
}

export function genHub(): void {
  const Wd = 28;
  const Hd = 22;
  const g = Array.from({ length: Hd }, () => new Array<number>(Wd).fill(1));
  for (let y = 3; y < Hd - 3; y++) for (let x = 3; x < Wd - 3; x++) g[y][x] = 0;
  W.Z = {
    hub: true,
    d: { name: "مخيّم الجمر", ilvl: 0, boss: "" },
    g,
    W: Wd,
    H: Hd,
    var: fillFloor(Wd, Hd, true),
    rooms: [{ x: 3, y: 3, w: Wd - 6, h: Hd - 6, cx: Wd >> 1, cy: Hd >> 1 }],
    mobs: [],
    loot: [],
    fx: [],
    proj: [],
    mproj: [],
    killed: 0,
    total: 0,
    objs: [
      { t: "stash", x: 8.5, y: 6.5, label: "افتح المخزن" },
      { t: "anvil", x: 13.5, y: 6.5, label: "افتح طاولة الصناعة" },
      { t: "npc", x: 19, y: 7, tile: CHARS.quarter, label: "تحدّث إلى أمين المؤن" },
      { t: "gate", x: 13.5, y: 16, label: "افتح البوابة" },
    ],
  };
  P.x = 13.5;
  P.y = 12;
  S.inHub = true;
  S.guardUsed = false;
  buildMap();
}

export function genZone(zi: number): void {
  const D = ZONES[zi];
  const Wd = D.w;
  const Hd = D.h;
  const g = Array.from({ length: Hd }, () => new Array<number>(Wd).fill(1));
  const rooms: Room[] = [];
  for (let i = 0; i < D.rooms * 4 && rooms.length < D.rooms; i++) {
    const w = rnd(7, 13);
    const h = rnd(7, 13);
    const x = rnd(1, Wd - w - 2);
    const y = rnd(1, Hd - h - 2);
    if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  rooms.forEach((r) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = 0;
  });
  const corr: [number, number][] = [];
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) {
      g[a.cy][x] = 0;
      g[a.cy + 1][x] = 0;
      corr.push([x, a.cy]);
    }
    for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) {
      g[y][b.cx] = 0;
      g[y][b.cx + 1] = 0;
      corr.push([b.cx, y]);
    }
  }
  // drop lone 1-tile wall nubs left between rooms/corridors — surrounded by
  // floor on all four sides they read as debris, not structure
  for (let y = 1; y < Hd - 1; y++)
    for (let x = 1; x < Wd - 1; x++)
      if (g[y][x] === 1 && !g[y - 1][x] && !g[y + 1][x] && !g[y][x - 1] && !g[y][x + 1]) g[y][x] = 0;

  const mobs: Mob[] = [];
  for (let p = 0; p < D.packs; p++) {
    let bx: number;
    let by: number;
    if (Math.random() < 0.28 && corr.length) {
      const c = pick(corr);
      bx = c[0] + 0.5;
      by = c[1] + 0.5;
    } else {
      const r = rooms[rnd(1, rooms.length - 1)];
      bx = rnd(r.x + 2, r.x + r.w - 3) + 0.5;
      by = rnd(r.y + 2, r.y + r.h - 3) + 0.5;
    }
    const n = rnd(3, 6);
    for (let k = 0; k < n; k++) {
      const mx = clamp(bx + (Math.random() - 0.5) * 2.6, 1, Wd - 2);
      const my = clamp(by + (Math.random() - 0.5) * 2.6, 1, Hd - 2);
      if (g[Math.floor(my)][Math.floor(mx)] === 1) continue;
      mobs.push(newMob(D, mx, my, { ranged: Math.random() < 0.28 }));
    }
    if (Math.random() < 0.35) {
      const mx = clamp(bx, 1, Wd - 2);
      const my = clamp(by, 1, Hd - 2);
      if (g[Math.floor(my)][Math.floor(mx)] === 0) mobs.push(newMob(D, mx, my, { elite: true }));
    }
  }
  const cr = rooms[rnd(1, rooms.length - 2)];
  const nr = rooms[rnd(1, rooms.length - 2)];
  W.Z = {
    hub: false,
    d: D,
    g,
    W: Wd,
    H: Hd,
    var: fillFloor(Wd, Hd, false),
    rooms,
    mobs,
    loot: [],
    fx: [],
    proj: [],
    mproj: [],
    killed: 0,
    total: mobs.length,
    chestFound: false,
    bossUp: false,
    portal: null,
    showChest: false,
    bossRoom: rooms[rooms.length - 1],
    objs: [
      { t: "chest", x: cr.cx + 0.5, y: cr.cy + 0.5, label: "افتح الصندوق" },
      { t: "npc", x: nr.cx + 1.5, y: nr.cy + 0.5, tile: CHARS.scholar, npcKind: "scholar", label: "تحدّث إلى العالِمة" },
      // the way back in — the entrance you spawned at. interact -> toHub().
      { t: "gate", x: rooms[0].cx - 0.7, y: rooms[0].cy + 0.5, label: "عُد إلى المخيّم" },
    ],
  };
  P.x = rooms[0].cx + 0.5;
  P.y = rooms[0].cy + 0.5;
  S.inHub = false;
  S.guardUsed = false;
  buildMap();
}

export interface NewMobOpts {
  boss?: boolean;
  elite?: boolean;
  ranged?: boolean;
}
export function newMob(D: ZoneDef, x: number, y: number, o?: NewMobOpts): Mob {
  o = o || {};
  const boss = !!o.boss;
  const elite = !!o.elite;
  const lvl = D.ilvl + (boss ? 4 : elite ? 2 : 0);
  const hpMul = boss ? 18 : elite ? 3.4 : 1;
  const atkMul = boss ? 2.1 : elite ? 1.55 : 1;
  const m: Mob = {
    x, y, boss, elite,
    ranged: !!o.ranged,
    tile: boss ? D.bossTile : MOBS[pick(D.kinds)],
    name: boss ? D.boss : "",
    lvl,
    hp: Math.round(95 * (1 + lvl * 0.55) * hpMul),
    max: 1,
    atk: Math.round(8 * (1 + lvl * 0.42) * atkMul),
    def: Math.round(3.5 * (1 + lvl * 0.34)),
    r: boss ? 0.85 : elite ? 0.55 : 0.42,
    // bumped from the prototype's 1.7/1.75/1.85 — see the player-speed note
    // in combat.update(). Chill still halves this (cold builds stay strong).
    spd: (boss ? 2.5 : elite ? 2.6 : 2.75) + Math.random() * 0.4,
    cd: Math.random(),
    agro: false,
    flip: false,
    anim: Math.random() * 9,
    burn: 0,
    burnDps: 0,
    chill: 0,
    tele: 0,
    phase: 0,
  };
  m.max = m.hp;
  return m;
}
