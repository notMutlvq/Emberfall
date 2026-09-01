/* ===================== quests =====================
 * Quartermaster bounties, the Lost Scholar, and zone-object interaction.
 * Ported verbatim from emberfall-v9.html.
 */
import { S, W, ZONES, rnd, $, type Obj, type ZoneDef } from "./core.ts";
import { toast, lootMsg } from "./hud.ts";
import { dropLoot } from "./combat.ts";
import { toHub } from "./state.ts";
import { go, switchBagTab, paintAll, popup, closeBtn } from "../ui/sheets.ts";
import { t } from "../i18n/index.ts";

export interface QuestOffer {
  t: string;
  n: number;
  zi: number;
  text: (n: number) => string;
  g: number;
  s: number;
}

export function offerQuests(): void {
  const open = ZONES.map((_z, i) => i).filter((i) => i === 0 || S.cleared.includes(i - 1));
  const zi = open[open.length - 1];
  const D: ZoneDef = ZONES[zi];
  const pool: QuestOffer[] = [
    { t: "kill", n: rnd(20, 35), zi, text: (n) => t("questSlayFoes", { n, zone: D.name }), g: Math.round(160 * (1 + D.ilvl * 0.35)), s: 1 },
    { t: "boss", n: 1, zi, text: () => t("questSlayBoss", { boss: D.boss }), g: Math.round(320 * (1 + D.ilvl * 0.35)), s: 2 },
    { t: "chest", n: 1, zi, text: () => t("questChest", { zone: D.name }), g: Math.round(180 * (1 + D.ilvl * 0.35)), s: 1 },
  ];
  const av = pool.filter((p) => !S.quests.some((q) => q.t === p.t && q.zi === p.zi && !q.done));
  if (!av.length) return popup(`<b>${t("quartermaster")}</b><div class="meta" style="margin-top:6px">${t("qmNothingNew")}</div>` + closeBtn());
  window.__offer = av;
  popup(
    `<b>${t("quartermaster")}</b>` +
      `<div class="meta" style="margin:6px 0 10px">${t("qmTakeBounty")}</div>` +
      av
        .map(
          (p, i) =>
            `<div class="card"><div>${p.text(p.n)}</div><div class="meta">${t("questReward", { gold: p.g, shard: p.s })}</div>
   <button class="btn go" style="margin-top:7px" data-take="${i}">${t("accept")}</button></div>`,
        )
        .join("") +
      closeBtn(),
  );
}

export function takeQuest(i: number): void {
  const p = window.__offer?.[i];
  if (!p) return;
  S.quests.push({ t: p.t, n: p.n, prog: 0, zi: p.zi, label: p.text(p.n), g: p.g, s: p.s, done: false });
  toast(t("bountyAccepted"));
  ($("pop") as HTMLElement).classList.remove("on");
  paintAll();
}

export function questTick(kind: string): void {
  S.quests.forEach((q) => {
    if (q.done || q.zi !== S.zone) return;
    if (q.t === kind) {
      q.prog++;
      if (q.prog >= q.n) {
        q.done = true;
        S.gold += q.g;
        S.shard += q.s;
        toast(t("bountyComplete", { gold: q.g, shard: q.s }));
      }
    }
  });
}

export function interact(o: Obj | null): void {
  if (!o) return;
  const Z = W.Z;
  if (o.t === "stash") {
    go("gear");
    switchBagTab("stash");
  } else if (o.t === "anvil") go("craft");
  else if (o.t === "gate") {
    if (Z.hub) go("maps"); // the camp gate opens the Atlas / travel list
    else return toHub(); // a dungeon gate is the way back out
  } else if (o.t === "chest") {
    o.used = true;
    Z.chestFound = true;
    S.gold += Math.round(90 * (1 + Z.d.ilvl * 0.35));
    dropLoot(o.x, o.y, Z.d.ilvl + 5, 2);
    dropLoot(o.x + 0.8, o.y, Z.d.ilvl + 2);
    if (S.pots < S.POTMAX) Z.loot.push({ x: o.x - 0.8, y: o.y, pot: true, b: 0 });
    lootMsg(t("chestOpened"));
    questTick("chest");
  } else if (o.npcKind === "scholar") {
    o.used = true;
    S.shard += 1;
    const g = Math.round(50 * (1 + Z.d.ilvl * 0.35));
    S.gold += g;
    Z.showChest = true;
    popup(`<b>${t("lostScholar")}</b><div class="meta" style="margin:6px 0">${t("scholarText")}</div><div>${t("scholarReward", { gold: g })}</div>` + closeBtn());
  } else if (o.t === "npc") offerQuests();
  paintAll();
}
