/* ===================== core =====================
 * Shared constants, data tables, types and the mutable game singletons.
 * This module imports nothing from its siblings so it can be the cycle-breaker
 * every other game module depends on.
 * Ported verbatim from emberfall-v9.html — do not rebalance here.
 */

/* ---------- tiny helpers ---------- */
export const rnd = (a: number, b: number): number => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

/* ---------- tilesheet / atlas geometry ---------- */
export const TW = 16;
export const COLS = 12;
export const HF = 64; // hero frame size
export const ENV = { floors: 6, walls: 4, props: 10 } as const;
export const ANIM = {
  idle: { row: 0, n: 4, fps: 6 },
  walk: { row: 1, n: 6, fps: 13 },
  attack: { row: 2, n: 6, fps: 17 },
} as const;
export type AnimKey = keyof typeof ANIM;

export function tsrc(i: number): [number, number] {
  return [(i % COLS) * TW, Math.floor(i / COLS) * TW];
}

export const T = {
  floor: [48, 49, 50, 51],
  hubFloor: [42, 48],
  wall: 40,
  chest: 90,
  chestOpen: 89,
  stash: 92,
  anvil: 74,
  table: 72,
  gate: 41,
  potion: 113,
  icon: { weapon: 104, armor: 56, ring: -1 } as Record<Slot, number>,
} as const;

export const CHARS = { warrior: 96, ranger: 112, mage: 84, quarter: 86, scholar: 99 } as const;
export const MOBS: Record<string, number> = {
  slime: 108, mummy: 109, demon: 110, dwarf: 111, bat: 120, ghost: 121, spider: 122, worm: 123,
};
export const PROPS = [101, 102, 66, 64, 65, 63];

export const ELCOL: Record<string, string> = {
  phys: "#e8e4d6", fire: "#e07a3c", cold: "#6fc3d9", light: "#c9a8f0", none: "#5f9a6a",
};

/* ---------- items ---------- */
export type Slot = "weapon" | "armor" | "ring";
export type RarityKey = "n" | "m" | "r" | "l";

export interface Affix {
  id: string;
  val: number;
  lock: boolean;
}
export interface Item {
  uid: number;
  slot: Slot;
  ilvl: number;
  rar: number;
  name: string;
  base: number;
  plus: number;
  affixes: Affix[];
}

export const RARITY: { k: RarityKey; name: string; aff: number; mat: number }[] = [
  { k: "n", name: "Common", aff: 1, mat: 1 },
  { k: "m", name: "Fine", aff: 2, mat: 2 },
  { k: "r", name: "Rare", aff: 3, mat: 5 },
  { k: "l", name: "Relic", aff: 4, mat: 10 },
];

export const BASES: Record<Slot, [string, number][]> = {
  weapon: [["Rusted Blade", 4], ["Notched Axe", 5], ["Bone Cleaver", 6], ["Ember Sabre", 7]],
  armor: [["Torn Hide", 3], ["Iron Plate", 4], ["Ashwood Mail", 5], ["Emberweave", 6]],
  ring: [["Copper Band", 2], ["Sigil Ring", 3], ["Ashen Loop", 4], ["Ember Signet", 5]],
};

export const AFFIXES: { id: string; label: string; per: number }[] = [
  { id: "atk", label: "attack", per: 0.85 },
  { id: "def", label: "armour", per: 0.7 },
  { id: "hp", label: "life", per: 3.6 },
  { id: "crit", label: "crit chance", per: 0.3 },
  { id: "lech", label: "leech", per: 0.2 },
  { id: "spd", label: "move speed", per: 0.45 },
  { id: "fire", label: "fire damage", per: 1.3 },
  { id: "cold", label: "cold damage", per: 1.3 },
  { id: "light", label: "lightning damage", per: 1.3 },
  { id: "resist", label: "resistance", per: 0.32 },
  { id: "mana", label: "maximum mana", per: 1.5 },
  { id: "regen", label: "mana regen", per: 0.11 },
];

export const APOOL: Record<Slot, string[]> = {
  weapon: ["atk", "crit", "fire", "cold", "light", "lech"],
  armor: ["hp", "def", "resist", "mana", "regen", "spd"],
  ring: ["atk", "crit", "hp", "def", "resist", "mana", "regen", "lech", "fire", "cold", "light", "spd"],
};

/* ---------- zones ---------- */
export interface ZoneDef {
  name: string;
  ilvl: number;
  packs: number;
  boss: string;
  kinds: string[];
  bossTile: number;
  w: number;
  h: number;
  rooms: number;
}

export const ZONES: ZoneDef[] = [
  { name: "Ashen Hollow", ilvl: 1, packs: 9, boss: "Hollow Warden", kinds: ["slime", "bat"], bossTile: MOBS.demon, w: 76, h: 76, rooms: 14 },
  { name: "Saltmarsh Ruin", ilvl: 9, packs: 11, boss: "Drowned Priest", kinds: ["worm", "spider"], bossTile: MOBS.ghost, w: 84, h: 84, rooms: 16 },
  { name: "Cinder Vault", ilvl: 18, packs: 13, boss: "Vault Construct", kinds: ["dwarf", "mummy"], bossTile: MOBS.dwarf, w: 92, h: 92, rooms: 18 },
  { name: "Weeping Spire", ilvl: 28, packs: 15, boss: "Spire Seraph", kinds: ["ghost", "bat"], bossTile: MOBS.ghost, w: 98, h: 98, rooms: 20 },
  { name: "Emberfall", ilvl: 40, packs: 17, boss: "The Last Ember", kinds: ["demon", "mummy"], bossTile: MOBS.demon, w: 104, h: 104, rooms: 22 },
];

export interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number }

export interface Mob {
  x: number; y: number;
  boss: boolean; elite: boolean; ranged: boolean;
  tile: number; name: string; lvl: number;
  hp: number; max: number;
  atk: number; def: number;
  r: number; spd: number;
  cd: number; agro: boolean; flip: boolean; anim: number;
  burn: number; burnDps: number; chill: number; tele: number; phase: number;
  slamX?: number; slamY?: number;
}

export interface Proj {
  x: number; y: number; vx: number; vy: number;
  dmg: number; el?: string; st: Stats; am?: AbMods | null;
  pierce: number; life: number; hitList: Mob[]; c: string;
}
export interface MProj {
  x: number; y: number; vx: number; vy: number; dmg: number; life: number; c: string;
}
export interface Fx {
  x: number; y: number; t: number; c: string;
  v?: number | string;
  ground?: boolean; done?: boolean; r?: number; dmg?: number; st?: Stats; el?: string; am?: AbMods | null;
  ring?: number; line?: [number, number]; slash?: boolean;
}
export interface Loot {
  x: number; y: number; b: number;
  item?: Item; pot?: boolean;
}
export interface Obj {
  t: string; x: number; y: number; label: string;
  tile?: number; npcKind?: string; used?: boolean;
}

export interface Zone {
  hub: boolean;
  d: ZoneDef | { name: string; ilvl: number; boss: string };
  g: number[][];
  W: number; H: number;
  var: number[][];
  rooms: Room[];
  mobs: Mob[];
  loot: Loot[];
  fx: Fx[];
  proj: Proj[];
  mproj: MProj[];
  killed: number;
  total: number;
  objs: Obj[];
  map?: HTMLCanvasElement;
  chestFound?: boolean;
  bossUp?: boolean;
  portal?: { x: number; y: number } | null;
  showChest?: boolean;
  bossRoom?: Room;
}

/* ---------- abilities ---------- */
export interface AbNode { id: string; n: string; d: string; m: Record<string, number> }
export type AbType =
  | "nova" | "ground" | "shot" | "multi" | "chain"
  | "dash" | "blink" | "dashHit" | "heal" | "aura";
export interface Ability {
  id: string;
  name: string;
  lvl: number;
  type: AbType;
  el: string;
  cd: number;
  mult?: number;
  r?: number;
  heal?: number;
  n?: number;
  spread?: number;
  pierce?: number;
  jumps?: number;
  dur?: number;
  up: AbNode[][];
  until?: number;
}

/* ---------- computed-stat shapes ---------- */
export interface Stats {
  atk: number; def: number; hp: number; crit: number; lech: number; spd: number;
  fire: number; cold: number; light: number; resist: number; mana: number; regen: number;
  aspd: number; guard: number;
}
export interface AbMods {
  dmg: number; cd: number; rad: number; proj: number; pierce: number; jumps: number;
  burn: number; chill: number; hits: number; heal: number; dur: number;
  vsChill: number; addCold: number; spread: number; iframe: number;
}
export interface GlobalMods {
  gAtk: number; gHp: number; gCrit: number; gMove: number; gArm: number; gAspd: number;
  gFire: number; gCold: number; gLight: number; guard: number;
}

/* ---------- run / meta quests ---------- */
export interface Quest {
  t: string; n: number; prog: number; zi: number;
  label: string; g: number; s: number; done: boolean;
}

export const xpNeed = (l: number): number => Math.floor(75 * Math.pow(1.4, l - 1));

/* ---------- run summary ---------- */
export interface RunSummary {
  kills: number; elites: number; bosses: number; deepest: number; zones: number;
  gold: number; best: Item | null; start: number;
  score?: number; dur?: number; lv?: number; cls?: ClassKey; name?: string;
}

export type ClassKey = "warrior" | "ranger" | "mage";

/* ---------- the mutable player-state singleton (S) ---------- */
export interface GameState {
  cls: ClassKey | null;
  lv: number; xp: number; pts: number;
  taken: Record<string, number>;
  slots: (string | null)[];
  selSlot: number | null;
  selAb: string | null;
  name: string;
  gold: number; shard: number;
  mats: Record<number, number>;
  protect: number;
  hp: number; mp: number;
  pots: number; POTMAX: number;
  eq: Record<Slot, Item | null>;
  bag: Item[]; BAGMAX: number;
  stash: Item[]; STASHMAX: number;
  zone: number;
  cleared: number[];
  craftMode: "reroll" | "lock" | "tier";
  craftSel: number | null;
  uid: number;
  quests: Quest[];
  inHub: boolean;
  guardUsed: boolean;
  auras: Record<string, number>;
  runs: number;
  best: RunSummary | null;
  run: RunSummary;
  pend?: ClassKey | null;
}

export const S: GameState = {
  cls: null, lv: 1, xp: 0, pts: 0, taken: {}, slots: [null, null, null, null], selSlot: null, selAb: null,
  name: "", gold: 150, shard: 2, mats: { 1: 0, 2: 0, 3: 0 }, protect: 1, hp: 100, mp: 50, pots: 2, POTMAX: 5,
  eq: { weapon: null, armor: null, ring: null }, bag: [], BAGMAX: 25, stash: [], STASHMAX: 40,
  zone: -1, cleared: [], craftMode: "reroll", craftSel: null, uid: 1, quests: [], inHub: true, guardUsed: false,
  auras: {}, runs: 0, best: null,
  run: { kills: 0, elites: 0, bosses: 0, deepest: 0, zones: 0, gold: 0, best: null, start: 0 },
};

/* ---------- the player entity (P) ---------- */
export interface Player {
  x: number; y: number;
  fx: number; fy: number;
  flip: boolean;
  anim: number;
  atkcd: number;
  dash: number;
  hit: number;
  inv: number;
  dir: number;
  st: AnimKey;
  ft: number;
  fi: number;
  atkT: number;
}
export const P: Player = {
  x: 5, y: 5, fx: 0, fy: 1, flip: false, anim: 0, atkcd: 0, dash: 0, hit: 0, inv: 0, dir: 0,
  st: "idle", ft: 0, fi: 0, atkT: 0,
};

export const joy = { dx: 0, dy: 0 };

/* ---------- current zone holder (was `let Z` in the prototype) ---------- */
export const W: { Z: Zone } = { Z: null as unknown as Zone };
