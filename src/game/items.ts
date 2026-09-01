/* ===================== items =====================
 * Generation, affixes, power, and the aggregate character-stat calc.
 * Ported verbatim from emberfall-v9.html.
 */
import {
  S, rnd, pick,
  AFFIXES, APOOL, BASES, RARITY,
  type Affix, type Item, type Slot, type Stats,
} from "./core.ts";
import { CLASSES } from "./classes.ts";
import { globalMods, auraBonus } from "./abilities.ts";

export function rollRarity(i: number): number {
  const r = Math.random() * 100;
  if (r < 1.5 + i * 0.1) return 3;
  if (r < 9 + i * 0.3) return 2;
  if (r < 34) return 1;
  return 0;
}

export function rollAff(a: { per: number }, i: number): number {
  return Math.max(1, Math.round(a.per * (1 + i * 0.45) * (0.6 + Math.random() * 0.8) * 10) / 10);
}

export function makeItem(ilvl: number, slot?: Slot | null, forceRar?: number): Item {
  const s: Slot = slot || pick<Slot>(["weapon", "armor", "ring"]);
  const ri = forceRar !== undefined ? forceRar : rollRarity(ilvl);
  const tier = Math.min(3, Math.floor(ilvl / 11));
  const bt = BASES[s][tier];
  const it: Item = {
    uid: S.uid++, slot: s, ilvl, rar: ri, name: pick(bt.names),
    base: Math.max(1, Math.round(bt.base * (1 + ilvl * 0.26))), plus: 0, affixes: [],
  };
  const pool = AFFIXES.filter((a) => APOOL[s].includes(a.id));
  for (let i = 0; i < RARITY[ri].aff; i++) {
    const a = pool.splice(rnd(0, pool.length - 1), 1)[0];
    it.affixes.push({ id: a.id, val: rollAff(a, ilvl), lock: false });
  }
  return it;
}

export function affLabel(f: Affix): string {
  const a = AFFIXES.find((x) => x.id === f.id)!;
  return (
    "+" + f.val +
    (["crit", "lech", "spd", "fire", "cold", "light", "resist"].includes(f.id)
      ? "%"
      : f.id === "regen"
        ? "/s"
        : "") +
    " " + a.label
  );
}

export interface ItemPower {
  atk: number; def: number; hp: number; crit: number; lech: number; spd: number;
  fire: number; cold: number; light: number; resist: number; mana: number; regen: number;
}

export function itemPower(it: Item | null | undefined): ItemPower {
  const o: ItemPower = {
    atk: 0, def: 0, hp: 0, crit: 0, lech: 0, spd: 0, fire: 0, cold: 0, light: 0, resist: 0, mana: 0, regen: 0,
  };
  if (!it) return o;
  const m = 1 + it.plus * 0.1;
  if (it.slot === "weapon") o.atk += it.base * m * 1.35;
  if (it.slot === "armor") {
    o.def += it.base * m;
    o.hp += it.base * m * 2.2;
    o.resist += it.base * m * 0.12;
  }
  if (it.slot === "ring") {
    o.hp += it.base * m * 1.1;
    o.mana += it.base * m * 1.6;
    o.atk += it.base * m * 0.35;
  }
  it.affixes.forEach((f) => {
    (o as unknown as Record<string, number>)[f.id] += f.val * m;
  });
  return o;
}

export function stats(): Stats {
  const C = CLASSES[S.cls!].base;
  const G = globalMods();
  const A = auraBonus();
  const t: Stats = {
    atk: (4 + S.lv * 1.3) * C.atk,
    def: (2 + S.lv * 0.8) * C.def,
    hp: (70 + S.lv * 9) * C.hp,
    crit: 5, lech: 0, spd: 0, fire: 0, cold: 0, light: 0, resist: 0,
    mana: C.mana + S.lv * 2,
    regen: C.regen + S.lv * 0.06,
    aspd: 0, guard: 0,
  };
  Object.values(S.eq).forEach((it) => {
    const p = itemPower(it);
    for (const k in p) (t as unknown as Record<string, number>)[k] += (p as unknown as Record<string, number>)[k];
  });
  t.atk *= 1 + (G.gAtk + A.gAtk) / 100;
  t.hp *= 1 + G.gHp / 100;
  t.def *= 1 + G.gArm / 100;
  t.resist = Math.min(70, t.resist);
  t.crit += G.gCrit + A.gCrit;
  t.spd += G.gMove;
  t.fire += G.gFire + A.gFire;
  t.cold += G.gCold + A.gCold;
  t.light += G.gLight + A.gLight;
  t.aspd = G.gAspd + A.gAspd;
  t.guard = G.guard;
  for (const k in t) (t as unknown as Record<string, number>)[k] = Math.round((t as unknown as Record<string, number>)[k] * 10) / 10;
  return t;
}

export function itemScore(it: Item): number {
  const p = itemPower(it);
  return (
    p.atk * 3 + p.def * 2 + p.hp * 0.4 + p.crit * 4 + p.lech * 3 + p.spd * 2 +
    (p.fire + p.cold + p.light) * 1.5 + p.resist * 2.5 + p.mana * 0.4 + p.regen * 8
  );
}

export function matTier(it: Item): number {
  return Math.min(3, Math.max(1, Math.floor(it.ilvl / 11) + 1));
}

export function allItems(): Item[] {
  return [...Object.values(S.eq).filter((x): x is Item => !!x), ...S.bag];
}
