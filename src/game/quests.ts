/* ===================== quests =====================
 * Quartermaster bounties, the Lost Scholar, and zone-object interaction.
 * Ported verbatim from emberfall-v9.html.
 */
import { S, W, ZONES, rnd, $, type Obj, type ZoneDef } from "./core.ts";
import { toast, lootMsg } from "./hud.ts";
import { dropLoot } from "./combat.ts";
import { go, switchBagTab, paintAll, popup, closeBtn } from "../ui/sheets.ts";

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
    { t: "kill", n: rnd(20, 35), zi, text: (n) => "Slay " + n + " foes in " + D.name, g: Math.round(160 * (1 + D.ilvl * 0.35)), s: 1 },
    { t: "boss", n: 1, zi, text: () => "Slay " + D.boss, g: Math.round(320 * (1 + D.ilvl * 0.35)), s: 2 },
    { t: "chest", n: 1, zi, text: () => "Recover a sealed chest in " + D.name, g: Math.round(180 * (1 + D.ilvl * 0.35)), s: 1 },
  ];
  const av = pool.filter((p) => !S.quests.some((q) => q.t === p.t && q.zi === p.zi && !q.done));
  if (!av.length) return popup('<b>Quartermaster</b><div class="meta" style="margin-top:6px">Nothing new.</div>' + closeBtn());
  window.__offer = av;
  popup(
    "<b>Quartermaster</b>" +
      '<div class="meta" style="margin:6px 0 10px">Take a bounty.</div>' +
      av
        .map(
          (p, i) =>
            `<div class="card"><div>${p.text(p.n)}</div><div class="meta">${p.g} gold · ${p.s} shard</div>
   <button class="btn go" style="margin-top:7px" data-take="${i}">Accept</button></div>`,
        )
        .join("") +
      closeBtn(),
  );
}

export function takeQuest(i: number): void {
  const p = window.__offer?.[i];
  if (!p) return;
  S.quests.push({ t: p.t, n: p.n, prog: 0, zi: p.zi, label: p.text(p.n), g: p.g, s: p.s, done: false });
  toast("Bounty accepted.");
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
        toast("Bounty complete: +" + q.g + "g +" + q.s + " shard");
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
  else if (o.t === "gate") go("maps");
  else if (o.t === "chest") {
    o.used = true;
    Z.chestFound = true;
    S.gold += Math.round(90 * (1 + Z.d.ilvl * 0.35));
    dropLoot(o.x, o.y, Z.d.ilvl + 5, 2);
    dropLoot(o.x + 0.8, o.y, Z.d.ilvl + 2);
    if (S.pots < S.POTMAX) Z.loot.push({ x: o.x - 0.8, y: o.y, pot: true, b: 0 });
    lootMsg("Chest opened");
    questTick("chest");
  } else if (o.npcKind === "scholar") {
    o.used = true;
    S.shard += 1;
    const g = Math.round(50 * (1 + Z.d.ilvl * 0.35));
    S.gold += g;
    Z.showChest = true;
    popup(`<b>Lost Scholar</b><div class="meta" style="margin:6px 0">She marks the chest on your map.</div><div>+${g} gold · +1 shard</div>` + closeBtn());
  } else if (o.t === "npc") offerQuests();
  paintAll();
}
