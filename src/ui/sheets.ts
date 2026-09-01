/* ===================== sheets =====================
 * Bag, Skills, Craft and Atlas panels — the sheet UI ported from
 * emberfall-v9.html. Strings go through t(); the document is RTL.
 */
import { S, $, RARITY, ZONES, AFFIXES, type Item, type Slot } from "../game/core.ts";
import { iconFor } from "../game/assets.ts";
import { stats, matTier, allItems, itemScore, rollAff, affLabel } from "../game/items.ts";
import { abList, abNodes, abCost, tierOpen } from "../game/abilities.ts";
import { paintHud, toast, buildSkills } from "../game/hud.ts";
import { CLASSES } from "../game/classes.ts";
import { persistMeta, saveRun } from "../game/save.ts";
import { t } from "../i18n/index.ts";

function slotLabel(sl: Slot): string {
  return sl === "weapon" ? t("slotWeapon") : sl === "armor" ? t("slotArmor") : t("slotRing");
}

function cellHTML(it: Item, sel?: boolean): string {
  return `<div class="cell r${RARITY[it.rar].k} ${sel ? "sel" : ""}" data-uid="${it.uid}">
 <img src="${iconFor(it)}">${it.plus ? `<span class="pl">+${it.plus}</span>` : ""}</div>`;
}

export function paintGear(): void {
  ($("eqstrip") as HTMLElement).innerHTML = (["weapon", "armor", "ring"] as Slot[])
    .map((sl) => {
      const it = S.eq[sl];
      return `<div class="eqslot" ${it ? `data-uid="${it.uid}"` : ""}><div class="lab">${slotLabel(sl)}</div>
   ${
     it
       ? `<img src="${iconFor(it)}" style="width:32px;image-rendering:pixelated">
    <div class="nm ${RARITY[it.rar].k}">${it.name}${it.plus ? " +" + it.plus : ""}</div>`
       : `<div style="height:32px;line-height:32px;color:#343a4f">—</div><div class="nm meta">${t("empty")}</div>`
   }</div>`;
    })
    .join("");
  const st = stats();
  $("stats").innerHTML =
    `${t("statLine1", { atk: st.atk, def: st.def, resist: st.resist })}<br>
  ${t("statLine2", { hp: Math.round(st.hp), mana: Math.round(st.mana), regen: st.regen })}<br>
  ${t("statLine3", { crit: st.crit, lech: st.lech, spd: st.spd, aspd: st.aspd })}<br>
  <span style="color:var(--fire)">${t("statFire", { v: st.fire })}</span> · <span style="color:var(--cold)">${t("statCold", { v: st.cold })}</span> · <span style="color:var(--light)">${t("statLight", { v: st.light })}</span>`;
  $("bagcount").textContent = t("bagCount", { n: S.bag.length, max: S.BAGMAX });
  let h = "";
  for (let i = 0; i < S.BAGMAX; i++) h += S.bag[i] ? cellHTML(S.bag[i]) : '<div class="cell empty"></div>';
  $("grid").innerHTML = h;
  $("stashnote").textContent = S.inHub
    ? t("stashCount", { n: S.stash.length, max: S.STASHMAX })
    : t("stashCampOnly");
  let sh = "";
  for (let i = 0; i < S.STASHMAX; i++) sh += S.stash[i] ? cellHTML(S.stash[i]) : '<div class="cell empty"></div>';
  $("stashgrid").innerHTML = sh;
}

export function switchBagTab(tab: "bag" | "stash"): void {
  document.querySelectorAll<HTMLElement>("[data-bt]").forEach((x) => x.classList.toggle("on", x.dataset.bt === tab));
  ($("bagwrap") as HTMLElement).style.display = tab === "bag" ? "block" : "none";
  ($("stashwrap") as HTMLElement).style.display = tab === "stash" ? "block" : "none";
}

export function paintTree(): void {
  $("sk-hint").textContent = t("skillsHint", { pts: S.pts });
  ($("ptdot") as HTMLElement).style.display = S.pts > 0 ? "block" : "none";
  $("treetitle").textContent = CLASSES[S.cls!].name;
  $("abslots").innerHTML = S.slots
    .map((id, i) => {
      const ab = id ? abList().find((a) => a.id === id) : null;
      return `<div class="slotb ${S.selSlot === i ? "sel" : ""}" data-slot="${i}">
   <span class="num">${i + 1}</span>${ab ? ab.name.replace("\n", "<br>") : t("empty")}</div>`;
    })
    .join("");
  $("ablist").innerHTML = abList()
    .map((ab) => {
      const unl = S.lv >= ab.lvl;
      const taken = abNodes(ab).filter((n) => S.taken[n.id]).length;
      return `<div class="abchip ${S.selAb === ab.id ? "on" : ""} ${unl ? "" : "lock"}" data-ab="${ab.id}">
   <b>${ab.name.replace("\n", " ")}</b>
   <span class="rq">${
     unl
       ? t("abUpgradesCost", { taken, total: abNodes(ab).length, mana: abCost(ab) })
       : t("abUnlocksAt", { lvl: ab.lvl })
   }</span></div>`;
    })
    .join("");
  const ab = S.selAb ? abList().find((a) => a.id === S.selAb) : null;
  if (!ab) {
    $("abtree").innerHTML = `<div class="meta">${t("abSelectPrompt")}</div>`;
    return;
  }
  if (S.lv < ab.lvl) {
    $("abtree").innerHTML = `<div class="meta">${t("abReachLevel", { lvl: ab.lvl })}</div>`;
    return;
  }
  $("abtree").innerHTML = ab.up
    .map((tier, ti) => {
      const open = tierOpen(ab, ti);
      const need = ti ? Math.ceil(ab.up[ti - 1].length / 2) : 0;
      return `<div class="tierlab"><span>${t("tierLabel", { n: ti + 1 })}</span>
   <span>${ti ? (open ? t("tierOpen") : t("tierNeeds", { n: need, t: ti })) : ""}</span></div>
   <div class="tier">${tier
     .map((n) => {
       const got = !!S.taken[n.id];
       const can = !got && open && S.pts > 0;
       return `<div class="node ${got ? "got" : can ? "can" : "no"}" data-node="${n.id}">
     <b>${n.n}</b><span class="d">${n.d}</span></div>`;
     })
     .join("")}</div>`;
    })
    .join("");
}

export function paintCraft(): void {
  $("mats").innerHTML =
    `${t("matsLine", { a: S.mats[1], b: S.mats[2], c: S.mats[3] })}<br>${t("shardsProt", { shard: S.shard, protect: S.protect })}`;
  const list = allItems();
  $("cgrid").innerHTML = list.map((it) => cellHTML(it, S.craftSel === it.uid)).join("") || `<div class="meta">${t("craftNothing")}</div>`;
  const it = list.find((i) => i.uid === S.craftSel);
  if (!it) {
    $("cpanel").innerHTML = `<div class="meta">${t("craftSelectPrompt")}</div>`;
    return;
  }
  const mt = matTier(it);
  const hint = {
    reroll: t("hintReroll", { cost: 5 + it.plus * 2, t: mt }),
    lock: t("hintLock"),
    tier: t("hintTier"),
  }[S.craftMode];
  $("cpanel").innerHTML = `<div class="card"><div class="row spread">
  <span class="${RARITY[it.rar].k}">${it.name}${it.plus ? " +" + it.plus : ""}</span>
  <span class="meta">${t("ilvlRarity", { ilvl: it.ilvl, rarity: RARITY[it.rar].name })}</span></div>
  <div class="meta" style="margin:6px 0">${hint}</div>
  ${it.affixes.map((f, i) => `<div class="aff ${f.lock ? "locked" : ""}" data-aff="${i}">${affLabel(f)}${f.lock ? " ⬥" : ""}</div>`).join("")}
  ${
    S.craftMode === "tier"
      ? `<button class="btn wide" style="margin-top:8px" data-tier="${it.uid}" ${it.rar >= 3 ? "disabled" : ""}>
   ${t("upgradeBtn", { cost: 16 * (it.rar + 1), t: mt })}</button>`
      : ""
  }</div>`;
}

export function paintMaps(): void {
  $("questlog").innerHTML = S.quests.length
    ? S.quests
        .map(
          (q) =>
            `<div class="qrow ${q.done ? "done" : ""}">${q.label} <span class="meta">${
              q.done ? t("questComplete") : t("questProgress", { prog: q.prog, n: q.n })
            }</span></div>`,
        )
        .join("")
    : `<div class="meta">${t("noBounties")}</div>`;
  $("maplist").innerHTML = ZONES.map((m, i) => {
    const done = S.cleared.includes(i);
    const open = i === 0 || S.cleared.includes(i - 1);
    return `<div class="card"><div class="row spread">
   <div><div>${m.name}</div><div class="meta">${t("zoneMeta", { ilvl: m.ilvl, boss: m.boss })}</div></div>
   <span class="tag ${done ? "ok" : open ? "" : "lock"}">${done ? t("zoneCleared") : open ? t("zoneOpen") : t("zoneLockedTag")}</span></div>
   <div class="row" style="gap:6px;margin-top:8px">
   <button class="btn" data-enter="${i}" ${open ? "" : "disabled"} style="padding:6px 10px;font-size:10px">${t("travel")}</button>
   </div></div>`;
  }).join("");
}

export function paintAll(): void {
  if (!S.cls) return;
  paintHud(true);
  paintGear();
  paintTree();
  paintCraft();
  paintMaps();
}

export function go(n: string): void {
  (["gear", "tree", "craft", "maps"] as const).forEach((k) => $("sh-" + k).classList.toggle("on", k === n));
  document.querySelectorAll<HTMLElement>(".navb").forEach((b) => b.classList.toggle("on", b.dataset.go === n));
  if (n === "gear") ($("newdot") as HTMLElement).style.display = "none";
  if (n !== "fight") paintAll();
}

export const sheetOpen = (): boolean =>
  !!document.querySelector(".sheet.on") ||
  $("pop").classList.contains("on") ||
  ($("over") as HTMLElement).style.display === "flex";

export function openItem(uid: number): void {
  const it = [...allItems(), ...S.stash].find((i) => i.uid === uid);
  if (!it) return;
  const equipped = Object.values(S.eq).includes(it);
  const inStash = S.stash.includes(it);
  const cur = S.eq[it.slot];
  const c = Math.round(40 * Math.pow(1.6, it.plus) * (1 + it.ilvl * 0.3));
  let cmp = "";
  if (!equipped && cur) {
    const d = Math.round(itemScore(it) - itemScore(cur));
    cmp = `<div class="meta" style="color:${d > 0 ? "#5f9a6a" : "#c0453c"}">${t("powerVsEquipped", { d: (d > 0 ? "+" : "") + d })}</div>`;
  }
  const risk = it.plus >= 8
    ? `<div class="meta">${t("enhanceRisk", { chance: Math.max(15, 68 - (it.plus - 8) * 8), protect: S.protect })}</div>`
    : "";
  popup(`<img src="${iconFor(it)}" style="width:42px;float:inline-start;margin-inline-start:8px;image-rendering:pixelated">
  <div class="${RARITY[it.rar].k}" style="font-size:13px">${it.name}${it.plus ? " +" + it.plus : ""}</div>
  <div class="meta">${t("raritySlotIlvl", { rarity: RARITY[it.rar].name, slot: slotLabel(it.slot), ilvl: it.ilvl })}</div>
  <div style="margin:8px 0">${it.affixes.map((f) => `<div class="aff">${affLabel(f)}</div>`).join("")}</div>
  ${cmp}${risk}
  <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">
   ${equipped || inStash ? "" : `<button class="btn go" data-eqp="${it.uid}">${t("equip")}</button>`}
   <button class="btn" data-enh="${it.uid}" ${S.gold < c || it.plus >= 15 ? "disabled" : ""}>${t("enhanceBtn", { cost: c })}</button>
   ${S.inHub && !equipped ? `<button class="btn" data-move="${it.uid}">${inStash ? t("withdraw") : t("deposit")}</button>` : ""}
   ${equipped ? "" : `<button class="btn" data-slv="${it.uid}">${t("salvage")}</button>`}
   <button class="btn" data-act="popclose">${t("close")}</button></div>`);
}

export function equip(uid: number): void {
  const it = S.bag.find((i) => i.uid === uid);
  if (!it) return;
  const cur = S.eq[it.slot];
  if (cur) S.bag.push(cur);
  S.eq[it.slot] = it;
  S.bag = S.bag.filter((b) => b.uid !== uid);
  toast(t("equippedItem", { name: it.name }));
  paintAll();
}

export function salvage(it: Item | undefined): void {
  if (!it) return;
  const mt = matTier(it);
  const n = RARITY[it.rar].mat + it.plus;
  S.mats[mt] += n;
  S.bag = S.bag.filter((b) => b.uid !== it.uid);
  S.stash = S.stash.filter((b) => b.uid !== it.uid);
  toast(t("matsGained", { n, t: mt }));
  paintAll();
  saveRun();
  persistMeta();
}

export function moveItem(uid: number): void {
  const inBag = S.bag.find((i) => i.uid === uid);
  if (inBag) {
    if (S.stash.length >= S.STASHMAX) return toast(t("stashFull"));
    S.stash.push(inBag);
    S.bag = S.bag.filter((b) => b.uid !== uid);
    toast(t("deposited"));
  } else {
    const it = S.stash.find((i) => i.uid === uid);
    if (!it) return;
    if (S.bag.length >= S.BAGMAX) return toast(t("bagFull"));
    S.bag.push(it);
    S.stash = S.stash.filter((b) => b.uid !== uid);
    toast(t("withdrawn"));
  }
  ($("pop") as HTMLElement).classList.remove("on");
  paintAll();
  saveRun();
  persistMeta();
}

export function enhance(it: Item | undefined): void {
  if (!it) return;
  const c = Math.round(40 * Math.pow(1.6, it.plus) * (1 + it.ilvl * 0.3));
  if (S.gold < c) return toast(t("notEnoughGold"));
  if (it.plus >= 15) return toast(t("enhanceMax"));
  S.gold -= c;
  if (it.plus < 8) {
    it.plus++;
    toast(t("enhanceUp", { plus: it.plus }));
  } else {
    const ch = Math.max(15, 68 - (it.plus - 8) * 8);
    if (Math.random() * 100 < ch) {
      it.plus++;
      toast(t("enhanceSuccess", { plus: it.plus }));
    } else if (S.protect > 0) {
      S.protect--;
      toast(t("enhanceFailProt"));
    } else {
      it.plus = Math.max(8, it.plus - 1);
      toast(t("enhanceFailDown", { plus: it.plus }));
    }
  }
  paintAll();
  openItem(it.uid);
}

export function reroll(it: Item, i: number): void {
  const mt = matTier(it);
  const cost = 5 + it.plus * 2;
  const f = it.affixes[i];
  if (f.lock) return toast(t("locked"));
  if (S.mats[mt] < cost) return toast(t("needMats", { n: cost, t: mt }));
  S.mats[mt] -= cost;
  f.val = rollAff(AFFIXES.find((a) => a.id === f.id)!, it.ilvl);
  toast(affLabel(f));
  paintAll();
}

export function lockAff(it: Item, i: number): void {
  const f = it.affixes[i];
  if (f.lock) {
    f.lock = false;
    paintAll();
    toast(t("unlocked"));
    return;
  }
  if (S.shard < 1) return toast(t("need1Shard"));
  S.shard--;
  f.lock = true;
  paintAll();
  toast(t("locked"));
}

export function upTier(it: Item | undefined): void {
  if (!it) return;
  if (it.rar >= 3) return toast(t("alreadyRelic"));
  const mt = matTier(it);
  const cost = 16 * (it.rar + 1);
  if (S.mats[mt] < cost) return toast(t("needMats", { n: cost, t: mt }));
  if (S.shard < 3) return toast(t("need3Shards"));
  S.mats[mt] -= cost;
  S.shard -= 3;
  it.rar++;
  const used = it.affixes.map((f) => f.id);
  const pool = AFFIXES.filter((a) => !used.includes(a.id));
  if (pool.length) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    it.affixes.push({ id: a.id, val: rollAff(a, it.ilvl), lock: false });
  }
  toast(t("nowRarity", { rarity: RARITY[it.rar].name }));
  paintAll();
}

export function takeNode(id: string): void {
  const ab = abList().find((a) => abNodes(a).some((n) => n.id === id));
  if (!ab) return;
  if (S.lv < ab.lvl) return toast(t("abLocked"));
  if (S.taken[id]) return toast(t("abAlreadyTaken"));
  if (S.pts <= 0) return toast(t("abNoPoints"));
  const ti = ab.up.findIndex((tier) => tier.some((n) => n.id === id));
  if (!tierOpen(ab, ti)) return toast(t("abTakeFirst", { n: Math.ceil(ab.up[ti - 1].length / 2), t: ti }));
  S.taken[id] = 1;
  S.pts--;
  const n = abNodes(ab).find((x) => x.id === id)!;
  toast(t("abLearned", { node: n.n }));
  paintAll();
}

export function setSlot(i: number): void {
  S.selSlot = S.selSlot === i ? null : i;
  paintTree();
}

export function chooseAb(id: string): void {
  const ab = abList().find((a) => a.id === id);
  if (!ab) return;
  if (S.selSlot !== null && S.lv >= ab.lvl) {
    const ex = S.slots.indexOf(id);
    if (ex >= 0) S.slots[ex] = null;
    S.slots[S.selSlot] = id;
    S.selSlot = null;
    buildSkills();
    toast(t("abEquipped", { name: ab.name.replace("\n", " ") }));
  }
  S.selAb = id;
  paintTree();
}

export const closeBtn = (): string =>
  `<button class="btn wide" data-act="popclose" style="margin-top:10px">${t("close")}</button>`;
export function popup(h: string): void {
  $("popin").innerHTML = h;
  $("pop").classList.add("on");
}
