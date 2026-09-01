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
export const ENV = { floors: 6, walls: 4, props: 14 } as const;
export const ANIM = {
  idle: { row: 0, n: 4, fps: 6 },
  walk: { row: 1, n: 6, fps: 13 },
  attack: { row: 2, n: 8, fps: 20 },
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
/* index into src/assets/mobs.png (see scripts/pack-mobs.mjs) */
export const MOBS: Record<string, number> = {
  slime: 0, mummy: 1, demon: 2, dwarf: 3, bat: 4, ghost: 5, spider: 6, worm: 7,
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

/* Arabic display strings live in the data tables (see stage-5 note in
 * src/i18n/index.ts): game content is colocated with its data, UI chrome
 * goes through t(). English originals are in git / emberfall-v9.html. */
export const RARITY: { k: RarityKey; name: string; aff: number; mat: number }[] = [
  { k: "n", name: "عادي", aff: 1, mat: 1 },
  { k: "m", name: "جيّد", aff: 2, mat: 2 },
  { k: "r", name: "نادر", aff: 3, mat: 5 },
  { k: "l", name: "أثري", aff: 4, mat: 10 },
];

/* base[slot][tier] — tier = min(3, floor(ilvl/11)). Several names per tier;
 * makeItem picks one at random for variety. */
export const BASES: Record<Slot, { names: string[]; base: number }[]> = {
  weapon: [
    { names: ["نصل صدئ", "خنجر مثلوم", "هراوة خشبية"], base: 4 },
    { names: ["فأس مثلوم", "سيف قصير", "مطرقة حديدية"], base: 5 },
    { names: ["ساطور عظمي", "سيف طويل", "معول حرب"], base: 6 },
    { names: ["سيف الجمر", "نصل اللهب", "حربة الجمر"], base: 7 },
  ],
  armor: [
    { names: ["جلد ممزّق", "قميص مبطّن", "درع خشبي"], base: 3 },
    { names: ["درع حديدي", "زرد خفيف", "صدرية جلدية"], base: 4 },
    { names: ["زرد خشب الرماد", "درع صفائحي", "درع مسلسل"], base: 5 },
    { names: ["نسيج الجمر", "درع الجمر", "زرد اللهب"], base: 6 },
  ],
  ring: [
    { names: ["خاتم نحاسي", "حلقة برونزية", "خاتم عظمي"], base: 2 },
    { names: ["خاتم الطلسم", "حلقة فضية", "خاتم منقوش"], base: 3 },
    { names: ["حلقة رمادية", "خاتم ذهبي", "طوق سحري"], base: 4 },
    { names: ["خاتم الجمر", "خاتم اللهب", "حلقة الجمرة"], base: 5 },
  ],
};

export const AFFIXES: { id: string; label: string; per: number }[] = [
  { id: "atk", label: "هجوم", per: 0.85 },
  { id: "def", label: "درع", per: 0.7 },
  { id: "hp", label: "صحة", per: 3.6 },
  { id: "crit", label: "فرصة حاسمة", per: 0.3 },
  { id: "lech", label: "امتصاص", per: 0.2 },
  { id: "spd", label: "سرعة حركة", per: 0.45 },
  { id: "fire", label: "ضرر ناري", per: 1.3 },
  { id: "cold", label: "ضرر جليدي", per: 1.3 },
  { id: "light", label: "ضرر صاعق", per: 1.3 },
  { id: "resist", label: "مقاومة", per: 0.32 },
  { id: "mana", label: "أقصى مانا", per: 1.5 },
  { id: "regen", label: "تجدد المانا", per: 0.11 },
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
  { name: "جوف الرماد", ilvl: 1, packs: 9, boss: "حارس الجوف", kinds: ["slime", "bat"], bossTile: MOBS.demon, w: 76, h: 76, rooms: 14 },
  { name: "خراب المستنقع المالح", ilvl: 9, packs: 11, boss: "الكاهن الغريق", kinds: ["worm", "spider"], bossTile: MOBS.ghost, w: 84, h: 84, rooms: 16 },
  { name: "قبو الجمر", ilvl: 18, packs: 13, boss: "آلة القبو", kinds: ["dwarf", "mummy"], bossTile: MOBS.dwarf, w: 92, h: 92, rooms: 18 },
  { name: "البرج الباكي", ilvl: 28, packs: 15, boss: "سيراف البرج", kinds: ["ghost", "bat"], bossTile: MOBS.ghost, w: 98, h: 98, rooms: 20 },
  { name: "سقوط الجمر", ilvl: 40, packs: 17, boss: "الجمرة الأخيرة", kinds: ["demon", "mummy"], bossTile: MOBS.demon, w: 104, h: 104, rooms: 22 },
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
  anim?: string; animDur?: number; animScale?: number;
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
