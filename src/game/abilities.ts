/* ===================== abilities =====================
 * Ability data + nine-node upgrade trees (tiers 3/3/2/1) and the
 * derived-modifier helpers. Ported verbatim from emberfall-v9.html.
 *
 * Tier N unlocks when ceil(prev tier size / 2) nodes are taken in tier N-1.
 */
import { S, type Ability, type AbNode, type AbMods, type GlobalMods, type ClassKey } from "./core.ts";
import { CLASSES } from "./classes.ts";

/* node helpers: generic + signature nodes */
const GEN = {
  dmg: (v: number): Omit<AbNode, "id"> => ({ n: "Force", d: "+" + v + "% damage", m: { dmg: v } }),
  cdr: (v: number): Omit<AbNode, "id"> => ({ n: "Tempo", d: "-" + v + "% cooldown", m: { cd: v } }),
  crit: (v: number): Omit<AbNode, "id"> => ({ n: "Precision", d: "+" + v + "% crit", m: { gCrit: v } }),
  life: (v: number): Omit<AbNode, "id"> => ({ n: "Vigor", d: "+" + v + "% life", m: { gHp: v } }),
  pow: (v: number): Omit<AbNode, "id"> => ({ n: "Might", d: "+" + v + "% attack", m: { gAtk: v } }),
};

let NID = 0;
const nd = (o: Omit<AbNode, "id">): AbNode => ({ id: "n" + NID++, ...o });

function mkUp(
  s1: Omit<AbNode, "id">,
  s2: Omit<AbNode, "id">,
  s3: Omit<AbNode, "id">,
  cap: Omit<AbNode, "id">,
): AbNode[][] {
  return [
    [nd(GEN.dmg(12)), nd(GEN.cdr(10)), nd(s1)],
    [nd(GEN.dmg(16)), nd(GEN.crit(4)), nd(s2)],
    [nd(GEN.dmg(22)), nd(s3)],
    [nd(cap)],
  ];
}

export const ABIL: Record<ClassKey, Ability[]> = {
  warrior: [
    { id: "cleave", name: "CLEAVE", lvl: 1, type: "nova", el: "phys", cd: 4500, mult: 2.6, r: 2.3,
      up: mkUp(
        { n: "Wide Arc", d: "+30% radius", m: { rad: 30 } },
        { n: "Rend", d: "+25% damage, bleeds", m: { dmg: 25, burn: 40 } },
        { n: "Momentum", d: "-15% cooldown", m: { cd: 15 } },
        { n: "Whirlwind", d: "strikes twice", m: { hits: 1 } },
      ) },
    { id: "brand", name: "FIRE\nBRAND", lvl: 1, type: "nova", el: "fire", cd: 9000, mult: 2.1, r: 2.9,
      up: mkUp(
        { n: "Hot Coals", d: "+40% burn damage", m: { burn: 40 } },
        { n: "Wider Blaze", d: "+25% radius", m: { rad: 25 } },
        { n: "Ignition", d: "-18% cooldown", m: { cd: 18 } },
        { n: "Wildfire", d: "burns spread on kill", m: { spread: 1 } },
      ) },
    { id: "rally", name: "RALLY", lvl: 3, type: "heal", el: "none", cd: 18000, heal: 0.28,
      up: mkUp(
        { n: "Deep Draught", d: "+35% healing", m: { heal: 35 } },
        { n: "Second Wind", d: "+8% life", m: { gHp: 8 } },
        { n: "Iron Will", d: "+10% armour", m: { gArm: 10 } },
        { n: "Unbroken", d: "survive one lethal hit per zone", m: { guard: 1 } },
      ) },
    { id: "charge", name: "SHIELD\nCHARGE", lvl: 6, type: "dashHit", el: "phys", cd: 7000, mult: 2.2,
      up: mkUp(
        { n: "Longer Run", d: "+40% distance", m: { rad: 40 } },
        { n: "Heavy Impact", d: "+30% damage", m: { dmg: 30 } },
        { n: "Crushing", d: "chills what it hits", m: { addCold: 1 } },
        { n: "Juggernaut", d: "hits twice, -25% cooldown", m: { hits: 1, cd: 25 } },
      ) },
    { id: "slam", name: "GROUND\nSLAM", lvl: 11, type: "ground", el: "phys", cd: 9000, mult: 3.0, r: 2.6,
      up: mkUp(
        { n: "Fault Line", d: "+30% radius", m: { rad: 30 } },
        { n: "Concussion", d: "chills what it hits", m: { addCold: 1 } },
        { n: "Aftershock", d: "+25% damage", m: { dmg: 25 } },
        { n: "Cataclysm", d: "slams twice", m: { hits: 1 } },
      ) },
    { id: "immo", name: "IMMO\nLATE", lvl: 17, type: "aura", el: "fire", cd: 16000, mult: 0.9, r: 2.6, dur: 7,
      up: mkUp(
        { n: "Long Burn", d: "+3s duration", m: { dur: 3 } },
        { n: "Searing", d: "+35% damage", m: { dmg: 35 } },
        { n: "Bonfire", d: "+30% radius", m: { rad: 30 } },
        { n: "Cinderlord", d: "+60% fire damage while active", m: { gFire: 60 } },
      ) },
  ],
  ranger: [
    { id: "volley", name: "VOLLEY", lvl: 1, type: "multi", el: "phys", cd: 4500, mult: 1.4, n: 5, spread: 0.55,
      up: mkUp(
        { n: "Extra Shafts", d: "+2 arrows", m: { proj: 2 } },
        { n: "Barbed", d: "+25% damage", m: { dmg: 25 } },
        { n: "Pierce", d: "arrows pierce one more", m: { pierce: 1 } },
        { n: "Storm of Arrows", d: "+4 arrows", m: { proj: 4 } },
      ) },
    { id: "frost", name: "FROST\nSHOT", lvl: 1, type: "shot", el: "cold", cd: 8000, mult: 2.3, pierce: 3,
      up: mkUp(
        { n: "Deep Chill", d: "chill lasts +1.5s", m: { chill: 1.5 } },
        { n: "Splinter", d: "pierces two more", m: { pierce: 2 } },
        { n: "Shatter", d: "+30% damage to chilled", m: { vsChill: 30 } },
        { n: "Winter Lord", d: "+50% cold damage", m: { gCold: 50 } },
      ) },
    { id: "roll", name: "ROLL", lvl: 3, type: "dash", el: "none", cd: 6000,
      up: mkUp(
        { n: "Long Roll", d: "+40% distance", m: { rad: 40 } },
        { n: "Fleet", d: "+10% move speed", m: { gMove: 10 } },
        { n: "Recovery", d: "-20% cooldown", m: { cd: 20 } },
        { n: "Phase Roll", d: "briefly untouchable", m: { iframe: 1 } },
      ) },
    { id: "inova", name: "ICE\nNOVA", lvl: 6, type: "nova", el: "cold", cd: 8000, mult: 2.2, r: 2.8,
      up: mkUp(
        { n: "Wider Frost", d: "+30% radius", m: { rad: 30 } },
        { n: "Bitter Cold", d: "chill lasts +1.5s", m: { chill: 1.5 } },
        { n: "Freezing", d: "+25% damage", m: { dmg: 25 } },
        { n: "Permafrost", d: "strikes twice", m: { hits: 1 } },
      ) },
    { id: "rain", name: "ARROW\nRAIN", lvl: 11, type: "ground", el: "phys", cd: 10000, mult: 3.0, r: 2.6,
      up: mkUp(
        { n: "Wide Fall", d: "+30% radius", m: { rad: 30 } },
        { n: "Heavy Shafts", d: "+25% damage", m: { dmg: 25 } },
        { n: "Hail", d: "chills the area", m: { addCold: 1 } },
        { n: "Endless Quiver", d: "falls twice", m: { hits: 1 } },
      ) },
    { id: "focus", name: "HUNTER\nFOCUS", lvl: 17, type: "aura", el: "none", cd: 18000, mult: 0, dur: 8,
      up: mkUp(
        { n: "Sharper", d: "+8% crit while active", m: { gCrit: 8 } },
        { n: "Longer Focus", d: "+3s duration", m: { dur: 3 } },
        { n: "Quickdraw", d: "+15% attack speed", m: { gAspd: 15 } },
        { n: "Deadeye", d: "+25% attack while active", m: { gAtk: 25 } },
      ) },
  ],
  mage: [
    { id: "chain", name: "CHAIN", lvl: 1, type: "chain", el: "light", cd: 5000, mult: 2.0, jumps: 4,
      up: mkUp(
        { n: "Overload", d: "+2 jumps", m: { jumps: 2 } },
        { n: "Conduction", d: "+25% damage", m: { dmg: 25 } },
        { n: "Arc Reach", d: "+2 jumps", m: { jumps: 2 } },
        { n: "Stormlord", d: "+50% lightning damage", m: { gLight: 50 } },
      ) },
    { id: "meteor", name: "METEOR", lvl: 1, type: "ground", el: "fire", cd: 10000, mult: 3.2, r: 2.4,
      up: mkUp(
        { n: "Wider Impact", d: "+30% radius", m: { rad: 30 } },
        { n: "Combustion", d: "+50% burn damage", m: { burn: 50 } },
        { n: "Falling Faster", d: "-18% cooldown", m: { cd: 18 } },
        { n: "Cataclysm", d: "falls twice", m: { hits: 1 } },
      ) },
    { id: "blink", name: "BLINK", lvl: 3, type: "blink", el: "light", cd: 7000,
      up: mkUp(
        { n: "Far Step", d: "+45% blink range", m: { rad: 45 } },
        { n: "Ward", d: "+8% life", m: { gHp: 8 } },
        { n: "Quick Step", d: "-20% cooldown", m: { cd: 20 } },
        { n: "Phase", d: "briefly untouchable", m: { iframe: 1 } },
      ) },
    { id: "orb", name: "FROST\nORB", lvl: 6, type: "shot", el: "cold", cd: 8000, mult: 2.6, pierce: 4,
      up: mkUp(
        { n: "Dense Ice", d: "+25% damage", m: { dmg: 25 } },
        { n: "Lingering", d: "chill lasts +1.5s", m: { chill: 1.5 } },
        { n: "Shatter", d: "+30% damage to chilled", m: { vsChill: 30 } },
        { n: "Glacier", d: "pierces everything", m: { pierce: 6 } },
      ) },
    { id: "field", name: "STORM\nFIELD", lvl: 11, type: "ground", el: "light", cd: 11000, mult: 2.8, r: 2.8,
      up: mkUp(
        { n: "Wide Field", d: "+30% radius", m: { rad: 30 } },
        { n: "Static", d: "+25% damage", m: { dmg: 25 } },
        { n: "Charged", d: "+6% crit", m: { gCrit: 6 } },
        { n: "Tempest", d: "strikes twice", m: { hits: 1 } },
      ) },
    { id: "surge", name: "ARCANE\nSURGE", lvl: 17, type: "aura", el: "light", cd: 18000, mult: 1.0, r: 2.4, dur: 7,
      up: mkUp(
        { n: "Longer Surge", d: "+3s duration", m: { dur: 3 } },
        { n: "Amplify", d: "+35% damage", m: { dmg: 35 } },
        { n: "Wide Surge", d: "+30% radius", m: { rad: 30 } },
        { n: "Ascendant", d: "+20% attack while active", m: { gAtk: 20 } },
      ) },
  ],
};

/* ---------- lookups ---------- */
export function abList(): Ability[] {
  return S.cls ? ABIL[S.cls] : [];
}
export function abById(id: string): Ability | undefined {
  return abList().find((a) => a.id === id);
}
export function abNodes(ab: Ability): AbNode[] {
  return ab.up.flat();
}
export function tierOpen(ab: Ability, ti: number): boolean {
  if (ti === 0) return true;
  const prev = ab.up[ti - 1];
  const need = Math.ceil(prev.length / 2);
  return prev.filter((n) => S.taken[n.id]).length >= need;
}

export function abCost(ab: Ability): number {
  const base = ({ 1: 10, 3: 15, 6: 20, 11: 26, 17: 34 } as Record<number, number>)[ab.lvl] || 16;
  return Math.round(base * CLASSES[S.cls!].base.manaMul);
}

/* ---------- derived modifiers ---------- */
export function abMods(ab: Ability | null | undefined): AbMods {
  const m: AbMods = {
    dmg: 0, cd: 0, rad: 0, proj: 0, pierce: 0, jumps: 0, burn: 0, chill: 0, hits: 0, heal: 0, dur: 0,
    vsChill: 0, addCold: 0, spread: 0, iframe: 0,
  };
  if (!ab) return m;
  abNodes(ab).forEach((n) => {
    if (!S.taken[n.id]) return;
    for (const k in n.m) if (k in m) (m as unknown as Record<string, number>)[k] += n.m[k];
  });
  return m;
}

export function globalMods(): GlobalMods {
  const g: GlobalMods = {
    gAtk: 0, gHp: 0, gCrit: 0, gMove: 0, gArm: 0, gAspd: 0, gFire: 0, gCold: 0, gLight: 0, guard: 0,
  };
  abList().forEach((ab) =>
    abNodes(ab).forEach((n) => {
      if (!S.taken[n.id]) return;
      for (const k in n.m) if (k in g) (g as unknown as Record<string, number>)[k] += n.m[k];
    }),
  );
  return g;
}

export interface AuraBonus {
  gAtk: number; gCrit: number; gAspd: number; gFire: number; gCold: number; gLight: number;
}
export function auraBonus(): AuraBonus {
  const b: AuraBonus = { gAtk: 0, gCrit: 0, gAspd: 0, gFire: 0, gCold: 0, gLight: 0 };
  for (const id in S.auras) {
    if (S.auras[id] <= 0) continue;
    const ab = abById(id);
    if (!ab) continue;
    abNodes(ab).forEach((n) => {
      if (!S.taken[n.id]) return;
      for (const k in n.m) if (k in b) (b as unknown as Record<string, number>)[k] += n.m[k];
    });
  }
  return b;
}
