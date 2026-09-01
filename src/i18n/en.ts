/* English string table — debugging fallback, kept in parity with ar.ts.
 * Stage 1 note: the ported UI still renders its original inline English
 * strings (see game/, ui/sheets.ts, ui/menu.ts). This file is the
 * scaffold that stage 5 (full Arabic/RTL pass) will populate and wire
 * through `t()`, replacing every inline string in those modules.
 */
export const en = {
  appName: "Emberfall",
  newRun: "New run",
  login: "Log in",
  signup: "Sign up",
  username: "Username",
  password: "Password",
  leaderboard: "Leaderboard",
  bestRun: "Best run",
  level: "Level",
  life: "Life",
  mana: "Mana",
  damage: "Damage",
  armour: "Armour",
  resistance: "Resistance",
  critChance: "Crit chance",
  moveSpeed: "Move speed",
  attackSpeed: "Attack speed",
  bag: "Bag",
  stash: "Stash",
  workbench: "Workbench",
  abilities: "Abilities",
  upgrade: "Upgrade",
  tier: "Tier",
  equip: "Equip",
  salvage: "Salvage",
  reroll: "Reroll",
  lock: "Lock",
  enhance: "Enhance",
  materials: "Materials",
  shard: "Shard",
  gold: "Gold",
  potion: "Potion",
  zone: "Zone",
  boss: "Boss",
  bounty: "Bounty",
  kills: "Kills",
  youFell: "You fell",
};

export type Dict = Record<keyof typeof en, string>;
export type DictKey = keyof typeof en;
