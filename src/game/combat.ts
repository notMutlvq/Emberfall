/* ===================== combat =====================
 * Damage, status effects, AI, projectiles, XP/death, and ability activation.
 * Collision (solid/mv) lives here rather than engine.ts because every use
 * of it is inside this module's own update loop — same shape as the
 * prototype. Ported verbatim from emberfall-v9.html.
 */
import {
  S, P, W, joy, clamp, ELCOL, RARITY, ZONES, xpNeed, $,
  type Ability, type AbMods, type Item, type Mob, type Obj, type Stats, type ZoneDef,
} from "./core.ts";
import { CLASSES } from "./classes.ts";
import { abById, abList, abMods, abCost } from "./abilities.ts";
import { stats, itemScore, makeItem } from "./items.ts";
import { newMob } from "./zones.ts";
import { lootMsg, toast, buildSkills, paintHud } from "./hud.ts";
import { questTick } from "./quests.ts";
import { toHub } from "./state.ts";
import { recordRunEnd } from "./save.ts";

export const AI_R = 17;

export function solid(x: number, y: number): boolean {
  const Z = W.Z;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= Z.W || iy >= Z.H) return true;
  return Z.g[iy][ix] === 1;
}

export function mv(e: { x: number; y: number }, dx: number, dy: number, rad: number): void {
  if (!solid(e.x + dx + Math.sign(dx) * rad, e.y)) e.x += dx;
  if (!solid(e.x, e.y + dy + Math.sign(dy) * rad)) e.y += dy;
}

/* input state read by update(); populated by engine.ts */
export const keys = new Set<string>();

export function update(dt: number): void {
  const Z = W.Z;
  const st = stats();
  const C = CLASSES[S.cls!];
  const spd = (5.0 + st.spd * 0.04) * (P.dash > 0 ? 3.2 : 1);
  let dx = joy.dx;
  let dy = joy.dy;
  if (keys.size) {
    dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
    const m = Math.hypot(dx, dy) || 1;
    dx /= m;
    dy /= m;
  }
  const moving = !!(dx || dy);
  if (moving) {
    mv(P, dx * spd * dt, dy * spd * dt, 0.3);
    P.anim += dt * 11;
    P.fx = dx;
    P.fy = dy;
    P.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0;
  }
  if (P.atkT > 0) P.atkT -= dt;
  const wantSt = P.atkT > 0 ? "attack" : moving ? "walk" : "idle";
  if (wantSt !== P.st) {
    P.st = wantSt;
    P.fi = 0;
    P.ft = 0;
  }
  const A = { idle: { n: 4, fps: 6 }, walk: { n: 6, fps: 13 }, attack: { n: 6, fps: 17 } }[P.st];
  P.ft += dt;
  while (P.ft > 1 / A.fps) {
    P.ft -= 1 / A.fps;
    P.fi = (P.fi + 1) % A.n;
  }
  if (P.dash > 0) P.dash -= dt;
  if (P.hit > 0) P.hit -= dt;
  if (P.inv > 0) P.inv -= dt;
  S.mp = Math.min(st.mana, S.mp + st.regen * dt);
  for (const id in S.auras)
    if (S.auras[id] > 0) {
      S.auras[id] -= dt;
      const ab = abById(id);
      if (ab && (ab.mult || 0) > 0 && Math.random() < dt * 4) {
        const m = abMods(ab);
        const r = (ab.r || 2.4) * (1 + m.rad / 100);
        Z.mobs.forEach((q) => {
          if (Math.hypot(P.x - q.x, P.y - q.y) < r) hitMob(q, st.atk * ab.mult! * (1 + m.dmg / 100) * 0.5, st, ab.el, m);
        });
      }
    }

  if (!Z.hub) {
    P.atkcd -= dt;
    const near = nearestMob(C.base.range);
    if (near && P.atkcd <= 0) {
      P.atkcd = C.autoCd / (1 + st.aspd / 100);
      {
        const ax = near.x - P.x;
        const ay = near.y - P.y;
        P.dir = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 1 : 2) : ay < 0 ? 3 : 0;
      }
      P.atkT = Math.min(0.42, C.autoCd * 0.75);
      if (C.auto === "melee") {
        const a = Math.atan2(near.y - P.y, near.x - P.x);
        mv(P, Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.3);
        hitMob(near, st.atk, st, "phys", null);
        Z.fx.push({ x: P.x + Math.cos(a) * 0.6, y: P.y + Math.sin(a) * 0.6, slash: true, t: 0.15, c: "#e8e4d6" });
      } else shoot(near.x, near.y, st.atk, "phys", st, 1, null);
    }

    for (const m of Z.mobs) {
      const ddx = P.x - m.x;
      const ddy = P.y - m.y;
      const d = Math.hypot(ddx, ddy);
      if (d > AI_R && !m.boss) {
        if (m.burn > 0) {
          m.burn -= dt;
          m.hp -= m.burnDps * dt;
          if (m.hp <= 0) killMob(m);
        }
        continue;
      }
      if (d < 9) m.agro = true;
      if (m.burn > 0) {
        m.burn -= dt;
        m.hp -= m.burnDps * dt;
        if (m.hp <= 0) {
          killMob(m);
          continue;
        }
      }
      if (m.chill > 0) m.chill -= dt;
      if (!m.agro) continue;
      m.anim += dt * 8;
      const ms = m.spd * (m.chill > 0 ? 0.5 : 1);
      const want = m.ranged ? 4.2 : 1.0;
      if (d > want + 0.3) {
        const a = Math.atan2(ddy, ddx);
        mv(m, Math.cos(a) * ms * dt, Math.sin(a) * ms * dt, m.r);
        m.flip = Math.cos(a) < 0;
      } else if (m.ranged && d < want - 1) {
        const a = Math.atan2(ddy, ddx);
        mv(m, -Math.cos(a) * ms * dt, -Math.sin(a) * ms * dt, m.r);
      }
      m.cd -= dt;
      if (m.boss) {
        if (m.tele > 0) {
          m.tele -= dt;
          if (m.tele <= 0) {
            Z.fx.push({ x: m.slamX!, y: m.slamY!, ring: 2.6, t: 0.3, c: "#c0453c" });
            if (Math.hypot(P.x - m.slamX!, P.y - m.slamY!) < 2.6) takeHit(m.atk * 1.9, st);
          }
        }
        if (m.cd <= 0) {
          m.cd = 2.6;
          if (Math.random() < 0.45) {
            m.tele = 0.9;
            m.slamX = P.x;
            m.slamY = P.y;
          } else if (d < 9) mshoot(m);
        }
        const frac = m.hp / m.max;
        if (frac < 0.66 && m.phase < 1) {
          m.phase = 1;
          spawnAdds(m, 3);
        }
        if (frac < 0.33 && m.phase < 2) {
          m.phase = 2;
          spawnAdds(m, 4);
        }
      } else if (m.ranged) {
        if (m.cd <= 0 && d < 7) {
          m.cd = 2.1;
          mshoot(m);
        }
      } else if (d < 1.2 && m.cd <= 0) {
        m.cd = 1.25;
        takeHit(m.atk, st);
      }
    }

    Z.proj = Z.proj.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || solid(p.x, p.y)) return false;
      for (const m of Z.mobs) {
        if (p.hitList.includes(m)) continue;
        if (Math.hypot(p.x - m.x, p.y - m.y) < m.r + 0.3) {
          p.hitList.push(m);
          hitMob(m, p.dmg, p.st, p.el, p.am ?? null);
          if (--p.pierce <= 0) return false;
        }
      }
      return true;
    });
    Z.mproj = Z.mproj.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || solid(p.x, p.y)) return false;
      if (Math.hypot(p.x - P.x, p.y - P.y) < 0.5) {
        takeHit(p.dmg, stats());
        return false;
      }
      return true;
    });
    Z.fx.forEach((f) => {
      if (f.ground && !f.done && f.t < 0.45) {
        f.done = true;
        for (let i = 0; i < 1 + (f.am ? f.am.hits : 0); i++)
          Z.mobs.slice().forEach((m) => {
            if (Math.hypot(f.x - m.x, f.y - m.y) < f.r!) hitMob(m, f.dmg!, f.st!, f.el, f.am ?? null);
          });
      }
    });
    Z.loot = Z.loot.filter((l) => {
      if (Math.hypot(P.x - l.x, P.y - l.y) < 0.85) {
        if (l.pot) {
          if (S.pots < S.POTMAX) {
            S.pots++;
            lootMsg("Potion");
            return false;
          }
          return true;
        }
        grab(l.item!);
        return false;
      }
      return true;
    });
    if (!Z.bossUp && Z.mobs.length === 0) {
      Z.bossUp = true;
      Z.mobs.push(newMob(Z.d as ZoneDef, Z.bossRoom!.cx + 0.5, Z.bossRoom!.cy + 0.5, { boss: true }));
      lootMsg("The " + Z.d.boss + " awakens.");
    }
    if (Z.portal && Math.hypot(P.x - Z.portal.x, P.y - Z.portal.y) < 0.95) {
      toHub();
      return;
    }
  }
  let nearObj: Obj | null = null;
  (Z.objs || []).forEach((o) => {
    if (!o.used && Math.hypot(P.x - o.x, P.y - o.y) < 1.4) nearObj = o;
  });
  const ib = $("interact") as HTMLButtonElement;
  if (nearObj) {
    ib.classList.add("on");
    ib.textContent = (nearObj as Obj).label;
    window.__near = nearObj;
  } else {
    ib.classList.remove("on");
    window.__near = null;
  }
  Z.fx = Z.fx.filter((f) => {
    f.t -= dt;
    if (f.v !== undefined) f.y -= dt * 1.4;
    return f.t > 0;
  });
  paintHud();
}

function spawnAdds(m: Mob, n: number): void {
  const Z = W.Z;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 7;
    const mm = newMob(Z.d as ZoneDef, m.x + Math.cos(a) * 1.6, m.y + Math.sin(a) * 1.6, {});
    mm.agro = true;
    Z.mobs.push(mm);
  }
  lootMsg("It calls for aid.");
}

function mshoot(m: Mob): void {
  const Z = W.Z;
  const a = Math.atan2(P.y - m.y, P.x - m.x);
  const sp = 6.5;
  Z.mproj.push({ x: m.x, y: m.y - 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: m.atk * 0.9, life: 2.2, c: "#c0453c" });
}

export function takeHit(raw: number, st: Stats): void {
  if (P.inv > 0) return;
  const dm = Math.max(1, Math.round(raw * (100 / (100 + st.def)) * (1 - st.resist / 100) * (0.9 + Math.random() * 0.2)));
  S.hp -= dm;
  P.hit = 0.2;
  fx(P.x, P.y, dm, "#c0453c");
  if (S.hp <= 0) {
    if (st.guard && !S.guardUsed) {
      S.guardUsed = true;
      S.hp = Math.round(st.hp * 0.35);
      toast("Unbroken holds.");
    } else die();
  }
}

export function nearestMob(r: number): Mob | null {
  const Z = W.Z;
  let b: Mob | null = null;
  let bd = r;
  for (const m of Z.mobs) {
    const d = Math.hypot(P.x - m.x, P.y - m.y) - m.r;
    if (d < bd) {
      bd = d;
      b = m;
    }
  }
  return b;
}

function elemMult(el: string | undefined, st: Stats): number {
  return 1 + (el === "fire" ? st.fire : el === "cold" ? st.cold : el === "light" ? st.light : 0) / 100;
}

export function hitMob(m: Mob, raw: number, st: Stats, el: string | undefined, am: AbMods | null): void {
  const Z = W.Z;
  if (!Z.mobs.includes(m)) return;
  let d = raw * elemMult(el, st) * (100 / (100 + m.def)) * (0.9 + Math.random() * 0.2);
  if (m.chill > 0) d *= 1 + (am ? am.vsChill : 0) / 100;
  const c = Math.random() * 100 < st.crit;
  if (c) d *= 2;
  d = Math.max(1, Math.round(d));
  m.hp -= d;
  if (st.lech) S.hp = Math.min(st.hp, S.hp + Math.round((d * st.lech) / 100));
  fx(m.x, m.y, d, c ? "#e0a63c" : ELCOL[el ?? ""] || "#e8e4d6");
  if (el === "fire") {
    m.burn = 3;
    m.burnDps = d * 0.2 * (1 + (am ? am.burn : 0) / 100);
  }
  if (el === "cold" || (am && am.addCold)) m.chill = 2 + (am ? am.chill : 0);
  if (m.hp <= 0) killMob(m);
}

function killMob(m: Mob): void {
  const Z = W.Z;
  if (!Z.mobs.includes(m)) return;
  Z.mobs = Z.mobs.filter((x) => x !== m);
  const spread = abList().some((a) => abMods(a).spread && a.el === "fire");
  if (spread && m.burn > 0)
    Z.mobs.forEach((o) => {
      if (Math.hypot(o.x - m.x, o.y - m.y) < 2.5) {
        o.burn = 3;
        o.burnDps = m.burnDps * 0.7;
      }
    });
  const gg = Math.round((m.boss ? 140 : m.elite ? 38 : 11) * (1 + Z.d.ilvl * 0.32));
  S.gold += gg;
  S.run.gold += gg;
  S.run.kills++;
  if (m.elite && !m.boss) S.run.elites++;
  if (m.boss) {
    S.run.bosses++;
    S.run.zones++;
  }
  const pen = clamp(1 - (S.lv - m.lvl) * 0.09, 0.12, 1);
  gainXP(Math.round((m.boss ? 300 : m.elite ? 38 : 9) * (1 + Z.d.ilvl * 0.3) * pen));
  questTick(m.boss ? "boss" : "kill");
  if (m.boss) {
    S.shard += 3;
    lootMsg("+3 shards");
    if (!S.cleared.includes(S.zone)) S.cleared.push(S.zone);
    Z.portal = { x: m.x, y: m.y + 1.3 };
    for (let i = 0; i < 3; i++) dropLoot(m.x + (i - 1) * 0.7, m.y, Z.d.ilvl + 5, i === 0 ? 2 : undefined);
    lootMsg("Zone cleared. Portal home is open.");
  } else {
    Z.killed++;
    if (m.elite) {
      dropLoot(m.x, m.y, Z.d.ilvl + 3, 1);
      if (Math.random() < 0.3) S.shard++;
    } else if (Math.random() < 0.3) dropLoot(m.x, m.y, Z.d.ilvl);
    if (Math.random() < 0.1) Z.loot.push({ x: m.x, y: m.y, pot: true, b: Math.random() * 6 });
  }
}

export function dropLoot(x: number, y: number, ilvl: number, fr?: number): void {
  W.Z.loot.push({ x, y, item: makeItem(ilvl, null, fr), b: Math.random() * 6 });
}

function grab(it: Item): void {
  if (S.bag.length >= S.BAGMAX) {
    toast("Bag full.");
    return;
  }
  if (!S.run.best || itemScore(it) > itemScore(S.run.best)) S.run.best = it;
  S.bag.push(it);
  ($("newdot") as HTMLElement).style.display = "block";
  lootMsg(it.name + (it.rar ? " · " + RARITY[it.rar].name : ""));
  const cur = S.eq[it.slot];
  if (!cur || itemScore(it) > itemScore(cur) * 1.05) lootMsg("  ↑ upgrade");
}

function gainXP(n: number): void {
  S.xp += n;
  while (S.xp >= xpNeed(S.lv)) {
    S.xp -= xpNeed(S.lv);
    S.lv++;
    S.pts++;
    lootMsg("Level " + S.lv + " — skill point");
    ($("ptdot") as HTMLElement).style.display = "block";
    const nw = abList().filter((a) => a.lvl === S.lv);
    nw.forEach((a) => {
      lootMsg("New ability: " + a.name.replace("\n", " "));
      autoSlot(a.id);
    });
  }
}

export function autoSlot(id: string): void {
  const i = S.slots.indexOf(null);
  if (i >= 0) {
    S.slots[i] = id;
    buildSkills();
  }
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + "m " + (s % 60) + "s";
}

export function die(): void {
  const R = S.run;
  const dur = Date.now() - (R.start || Date.now());
  const score = S.lv * 100 + R.kills * 6 + R.elites * 25 + R.bosses * 250 + R.zones * 300;
  R.score = score;
  R.dur = dur;
  R.lv = S.lv;
  R.cls = S.cls!;
  R.name = S.name;
  const prev = S.best;
  if (!prev || score > (prev.score ?? 0)) S.best = { ...R };
  S.runs++;
  const Z = W.Z;
  $("oversub").textContent = S.name + " the " + CLASSES[S.cls!].name + " · run " + S.runs + " · " + fmtTime(dur);
  $("overstats").innerHTML =
    `<div class="slab">This run</div>
   reached level <b style="color:var(--gold)">${S.lv}</b><br>
   died in <b style="color:var(--gold)">${Z.hub ? "Ember Camp" : Z.d.name}</b><br>
   zones cleared ${R.zones} · deepest ${ZONES[R.deepest].name}<br>
   kills ${R.kills} · elites ${R.elites} · bosses ${R.bosses}<br>
   gold earned ${R.gold}<br>
   best find ${R.best ? RARITY[R.best.rar].name + " " + R.best.name + " (ilvl " + R.best.ilvl + ")" : "nothing worth keeping"}<br>
   <span style="color:var(--gold)">score ${score}</span>`;
  $("overbest").innerHTML = prev
    ? `<div class="slab">Best run so far</div>${prev.name || ""} the ${CLASSES[prev.cls!].name} · level ${prev.lv} · ${prev.zones} zones · score ${prev.score}`
    : '<div class="slab">Best run so far</div>this one — nothing to beat yet';
  $("overtitle").textContent = score > (prev ? (prev.score ?? 0) : 0) ? "A new best" : "You fell";
  ($("over") as HTMLElement).style.display = "flex";
  // run is over: drop the mirror, flush stash + best score + run count
  recordRunEnd();
}

function fx(x: number, y: number, v: number | string, c: string): void {
  W.Z.fx.push({ x, y: y - 0.6, v, c, t: 0.8 });
}

export function shoot(
  tx: number, ty: number, dmg: number, el: string | undefined, st: Stats, pierce: number, am: AbMods | null,
): void {
  const a = Math.atan2(ty - P.y, tx - P.x);
  const sp = 12;
  W.Z.proj.push({
    x: P.x, y: P.y - 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, el, st, am,
    pierce: pierce || 1, life: 1.2, hitList: [], c: ELCOL[el ?? ""] ?? "#e8e4d6",
  });
}

export function useSlot(i: number): void {
  const id = S.slots[i];
  const Z = W.Z;
  if (!id || !Z || Z.hub) return;
  const ab = abById(id);
  if (!ab) return;
  const m = abMods(ab);
  const st = stats();
  const now = performance.now();
  const cd = ab.cd * (1 - Math.min(60, m.cd) / 100);
  if ((ab.until || 0) > now) return;
  const cost = abCost(ab);
  if (S.mp < cost) {
    toast("Not enough mana.");
    return;
  }
  S.mp -= cost;
  const dmg = st.atk * (ab.mult || 0) * (1 + m.dmg / 100);
  const tgt = nearestMob(9);
  const hits = 1 + m.hits;
  activateAbility(ab, m, st, dmg, hits, tgt);
  ab.until = now + cd;
}

function activateAbility(ab: Ability, m: AbMods, st: Stats, dmg: number, hits: number, tgt: Mob | null): void {
  const Z = W.Z;
  if (ab.type === "heal") {
    const h = Math.round(st.hp * (ab.heal ?? 0) * (1 + m.heal / 100));
    S.hp = Math.min(st.hp, S.hp + h);
    fx(P.x, P.y, "+" + h, "#5f9a6a");
  } else if (ab.type === "dash") {
    P.dash = 0.24 * (1 + m.rad / 100);
    if (m.iframe) P.inv = 0.45;
    Z.fx.push({ x: P.x, y: P.y, ring: 0.9, t: 0.2, c: "#b3b9d0" });
  } else if (ab.type === "blink") {
    const dist = 4.5 * (1 + m.rad / 100);
    let bx = P.x;
    let by = P.y;
    for (let s = 0.25; s <= dist; s += 0.25) {
      const nx = P.x + P.fx * s;
      const ny = P.y + P.fy * s;
      if (solid(nx, ny)) break;
      bx = nx;
      by = ny;
    }
    Z.fx.push({ x: P.x, y: P.y, ring: 1.1, t: 0.25, c: ELCOL.light });
    P.x = bx;
    P.y = by;
    Z.fx.push({ x: bx, y: by, ring: 1.1, t: 0.25, c: ELCOL.light });
    if (m.iframe) P.inv = 0.4;
  } else if (ab.type === "dashHit") {
    P.dash = 0.22 * (1 + m.rad / 100);
    Z.mobs.slice().forEach((q) => {
      if (Math.hypot(P.x - q.x, P.y - q.y) < 2.2) for (let k = 0; k < hits; k++) hitMob(q, dmg, st, ab.el, m);
    });
  } else if (ab.type === "nova") {
    const r = ab.r! * (1 + m.rad / 100);
    for (let k = 0; k < hits; k++)
      Z.mobs.slice().forEach((q) => {
        if (Math.hypot(P.x - q.x, P.y - q.y) < r) hitMob(q, dmg, st, ab.el, m);
      });
    Z.fx.push({ x: P.x, y: P.y, ring: r, t: 0.3, c: ELCOL[ab.el] });
  } else if (ab.type === "shot") {
    if (!tgt) return;
    shoot(tgt.x, tgt.y, dmg, ab.el, st, (ab.pierce || 1) + m.pierce, m);
  } else if (ab.type === "multi") {
    if (!tgt) return;
    const n = (ab.n ?? 0) + m.proj;
    const a0 = Math.atan2(tgt.y - P.y, tgt.x - P.x);
    for (let k = 0; k < n; k++) {
      const a = a0 + (k - (n - 1) / 2) * ((ab.spread ?? 0) / n) * 2;
      const sp = 12;
      Z.proj.push({
        x: P.x, y: P.y - 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, el: ab.el, st, am: m,
        pierce: 1 + m.pierce, life: 1.2, hitList: [], c: ELCOL[ab.el],
      });
    }
  } else if (ab.type === "chain") {
    if (!tgt) return;
    let cur: Mob | undefined = tgt;
    const hit: Mob[] = [];
    let j = (ab.jumps ?? 0) + m.jumps;
    let px = P.x;
    let py = P.y;
    while (cur && j-- > 0) {
      hit.push(cur);
      Z.fx.push({ x: px, y: py, line: [cur.x, cur.y], t: 0.25, c: ELCOL.light });
      px = cur.x;
      py = cur.y;
      hitMob(cur, dmg, st, ab.el, m);
      cur = Z.mobs.filter((q) => !hit.includes(q) && Math.hypot(q.x - px, q.y - py) < 4)[0];
    }
  } else if (ab.type === "ground") {
    const t = tgt || { x: P.x + P.fx * 3, y: P.y + P.fy * 3 };
    Z.fx.push({ x: t.x, y: t.y, ground: true, r: ab.r! * (1 + m.rad / 100), dmg, el: ab.el, st, am: m, t: 0.6, c: ELCOL[ab.el] });
  } else if (ab.type === "aura") {
    S.auras[ab.id] = (ab.dur || 6) + m.dur;
    Z.fx.push({ x: P.x, y: P.y, ring: (ab.r || 2.4) * (1 + m.rad / 100), t: 0.4, c: ELCOL[ab.el] });
  }
}

export function drinkPotion(): void {
  if (S.pots <= 0) return;
  const st = stats();
  if (S.hp >= st.hp) return toast("Already full.");
  S.pots--;
  S.hp = Math.min(st.hp, S.hp + Math.round(st.hp * 0.4));
  S.mp = Math.min(st.mana, S.mp + Math.round(st.mana * 0.25));
  fx(P.x, P.y, "heal", "#7fd08d");
}
