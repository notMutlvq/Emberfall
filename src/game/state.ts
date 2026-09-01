/* ===================== run state =====================
 * New-run setup, hub/zone transitions. The mutable state object itself
 * (S) lives in core.ts; this module is the sequencing around it.
 * Ported verbatim from emberfall-v9.html (offline/idle farming removed —
 * see memory: emberfall-locked-decisions #3).
 */
import { S, $, ZONES } from "./core.ts";
import { abList } from "./abilities.ts";
import { makeItem, stats } from "./items.ts";
import { genHub, genZone } from "./zones.ts";
import { buildSkills, toast } from "./hud.ts";
import { autoSlot } from "./combat.ts";
import { go, paintAll } from "../ui/sheets.ts";
import { showScreen } from "../ui/screens.ts";
import { saveRun } from "./save.ts";

export function newRunState(): void {
  S.lv = 1;
  S.xp = 0;
  S.pts = 0;
  S.taken = {};
  S.slots = [null, null, null, null];
  S.selSlot = null;
  S.selAb = null;
  S.gold = 150;
  S.mats = { 1: 0, 2: 0, 3: 0 };
  S.protect = 1;
  S.pots = 2;
  S.auras = {};
  S.eq = { weapon: null, armor: null, ring: null };
  S.bag = [];
  S.quests = [];
  S.cleared = [];
  S.craftSel = null;
  S.zone = -1;
  S.guardUsed = false;
  S.run = { kills: 0, elites: 0, bosses: 0, deepest: 0, zones: 0, gold: 0, best: null, start: Date.now() };
  abList()
    .filter((a) => a.lvl <= 1)
    .forEach((a) => autoSlot(a.id));
  S.selAb = abList()[0].id;
  S.eq.weapon = makeItem(1, "weapon", 0);
  const st = stats();
  S.hp = st.hp;
  S.mp = st.mana;
  genHub();
  buildSkills();
  paintAll();
}

export function newRun(): void {
  ($("over") as HTMLElement).style.display = "none";
  S.pend = null;
  document.querySelectorAll(".cchoice").forEach((c) => c.classList.remove("on"));
  showScreen("pick");
}

export function toHub(): void {
  genHub();
  S.zone = -1;
  S.auras = {};
  paintAll();
  go("fight");
  saveRun();
}

export function enterZone(i: number): void {
  S.zone = i;
  S.run.deepest = Math.max(S.run.deepest, i);
  genZone(i);
  S.hp = stats().hp;
  S.auras = {};
  go("fight");
  toast("— " + ZONES[i].name + " —");
  paintAll();
  saveRun();
}
