/* ===================== sheets =====================
 * Bag, Skills, Craft and Atlas panels — the sheet UI ported verbatim from
 * emberfall-v9.html. Idle/offline farming intentionally dropped (see
 * memory: emberfall-locked-decisions #3) — this is a run-based roguelike.
 */
import { S, $, RARITY, ZONES, AFFIXES, type Item, type Slot } from "../game/core.ts";
import { iconFor } from "../game/assets.ts";
import { stats, matTier, allItems, itemScore, rollAff, affLabel } from "../game/items.ts";
import { abList, abNodes, abCost, tierOpen } from "../game/abilities.ts";
import { paintHud, toast, buildSkills } from "../game/hud.ts";
import { CLASSES } from "../game/classes.ts";

function cellHTML(it: Item, sel?: boolean): string {
  return `<div class="cell r${RARITY[it.rar].k} ${sel ? "sel" : ""}" data-uid="${it.uid}">
 <img src="${iconFor(it)}">${it.plus ? `<span class="pl">+${it.plus}</span>` : ""}</div>`;
}

export function paintGear(): void {
  ($("eqstrip") as HTMLElement).innerHTML = (["weapon", "armor", "ring"] as Slot[])
    .map((sl) => {
      const it = S.eq[sl];
      return `<div class="eqslot" ${it ? `data-uid="${it.uid}"` : ""}><div class="lab">${sl}</div>
   ${
     it
       ? `<img src="${iconFor(it)}" style="width:32px;image-rendering:pixelated">
    <div class="nm ${RARITY[it.rar].k}">${it.name}${it.plus ? " +" + it.plus : ""}</div>`
       : `<div style="height:32px;line-height:32px;color:#343a4f">—</div><div class="nm meta">empty</div>`
   }</div>`;
    })
    .join("");
  const st = stats();
  $("stats").innerHTML = `attack ${st.atk} · armour ${st.def} · resist ${st.resist}%<br>
  life ${Math.round(st.hp)} · mana ${Math.round(st.mana)} · regen ${st.regen}/s<br>
  crit ${st.crit}% · leech ${st.lech}% · move +${st.spd}% · haste ${st.aspd}%<br>
  <span style="color:var(--fire)">fire +${st.fire}%</span> · <span style="color:var(--cold)">cold +${st.cold}%</span> · <span style="color:var(--light)">light +${st.light}%</span>`;
  $("bagcount").textContent = "Bag " + S.bag.length + " / " + S.BAGMAX;
  let h = "";
  for (let i = 0; i < S.BAGMAX; i++) h += S.bag[i] ? cellHTML(S.bag[i]) : '<div class="cell empty"></div>';
  $("grid").innerHTML = h;
  $("stashnote").textContent = S.inHub ? "Stash " + S.stash.length + " / " + S.STASHMAX : "Stash only opens at Ember Camp.";
  let sh = "";
  for (let i = 0; i < S.STASHMAX; i++) sh += S.stash[i] ? cellHTML(S.stash[i]) : '<div class="cell empty"></div>';
  $("stashgrid").innerHTML = sh;
}

export function switchBagTab(t: "bag" | "stash"): void {
  document.querySelectorAll<HTMLElement>("[data-bt]").forEach((x) => x.classList.toggle("on", x.dataset.bt === t));
  ($("bagwrap") as HTMLElement).style.display = t === "bag" ? "block" : "none";
  ($("stashwrap") as HTMLElement).style.display = t === "stash" ? "block" : "none";
}

export function paintTree(): void {
  $("pts").textContent = String(S.pts);
  ($("ptdot") as HTMLElement).style.display = S.pts > 0 ? "block" : "none";
  $("treetitle").textContent = CLASSES[S.cls!].name;
  $("abslots").innerHTML = S.slots
    .map((id, i) => {
      const ab = id ? abList().find((a) => a.id === id) : null;
      return `<div class="slotb ${S.selSlot === i ? "sel" : ""}" data-slot="${i}">
   <span class="num">${i + 1}</span>${ab ? ab.name.replace("\n", "<br>") : "empty"}</div>`;
    })
    .join("");
  $("ablist").innerHTML = abList()
    .map((ab) => {
      const unl = S.lv >= ab.lvl;
      const pts = abNodes(ab).filter((n) => S.taken[n.id]).length;
      return `<div class="abchip ${S.selAb === ab.id ? "on" : ""} ${unl ? "" : "lock"}" data-ab="${ab.id}">
   <b>${ab.name.replace("\n", " ")}</b>
   <span class="rq">${unl ? pts + "/" + abNodes(ab).length + " upgrades · " + abCost(ab) + " mana" : "unlocks at level " + ab.lvl}</span></div>`;
    })
    .join("");
  const ab = S.selAb ? abList().find((a) => a.id === S.selAb) : null;
  if (!ab) {
    $("abtree").innerHTML = '<div class="meta">Select an ability to see its upgrades.</div>';
    return;
  }
  if (S.lv < ab.lvl) {
    $("abtree").innerHTML = "<div class=\"meta\">Reach level " + ab.lvl + " to unlock this ability.</div>";
    return;
  }
  $("abtree").innerHTML = ab.up
    .map((tier, ti) => {
      const open = tierOpen(ab, ti);
      const need = ti ? Math.ceil(ab.up[ti - 1].length / 2) : 0;
      return `<div class="tierlab"><span>Tier ${ti + 1}</span>
   <span>${ti ? (open ? "open" : "needs " + need + " from tier " + ti) : ""}</span></div>
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
  $("mats").innerHTML = `tier 1 ${S.mats[1]} · tier 2 ${S.mats[2]} · tier 3 ${S.mats[3]}<br>shards ${S.shard} · protections ${S.protect}`;
  const list = allItems();
  $("cgrid").innerHTML = list.map((it) => cellHTML(it, S.craftSel === it.uid)).join("") || '<div class="meta">Nothing yet.</div>';
  const it = list.find((i) => i.uid === S.craftSel);
  if (!it) {
    $("cpanel").innerHTML = '<div class="meta">Select an item above.</div>';
    return;
  }
  const t = matTier(it);
  const hint = {
    reroll: "Tap an affix to reroll. Cost " + (5 + it.plus * 2) + " T" + t + ".",
    lock: "Tap an affix to lock or unlock. 1 shard.",
    tier: "Raise rarity and gain one affix.",
  }[S.craftMode];
  $("cpanel").innerHTML = `<div class="card"><div class="row spread">
  <span class="${RARITY[it.rar].k}">${it.name}${it.plus ? " +" + it.plus : ""}</span>
  <span class="meta">ilvl ${it.ilvl} · ${RARITY[it.rar].name}</span></div>
  <div class="meta" style="margin:6px 0">${hint}</div>
  ${it.affixes.map((f, i) => `<div class="aff ${f.lock ? "locked" : ""}" data-aff="${i}">${affLabel(f)}${f.lock ? " ⬥" : ""}</div>`).join("")}
  ${
    S.craftMode === "tier"
      ? `<button class="btn wide" style="margin-top:8px" data-tier="${it.uid}" ${it.rar >= 3 ? "disabled" : ""}>
   Upgrade — ${16 * (it.rar + 1)} T${t} + 3 shards</button>`
      : ""
  }</div>`;
}

export function paintMaps(): void {
  $("questlog").innerHTML = S.quests.length
    ? S.quests
        .map(
          (q) =>
            `<div class="qrow ${q.done ? "done" : ""}">${q.label} <span class="meta">${q.done ? "complete" : q.prog + "/" + q.n}</span></div>`,
        )
        .join("")
    : '<div class="meta">None. Ask the Quartermaster at camp.</div>';
  $("maplist").innerHTML = ZONES.map((m, i) => {
    const done = S.cleared.includes(i);
    const open = i === 0 || S.cleared.includes(i - 1);
    return `<div class="card"><div class="row spread">
   <div><div>${m.name}</div><div class="meta">ilvl ${m.ilvl} · ${m.boss}</div></div>
   <span class="tag ${done ? "ok" : open ? "" : "lock"}">${done ? "cleared" : open ? "open" : "locked"}</span></div>
   <div class="row" style="gap:6px;margin-top:8px">
   <button class="btn" data-enter="${i}" ${open ? "" : "disabled"} style="padding:6px 10px;font-size:10px">Travel</button>
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
    cmp = `<div class="meta" style="color:${d > 0 ? "#5f9a6a" : "#c0453c"}">${d > 0 ? "+" : ""}${d} power vs equipped</div>`;
  }
  const risk = it.plus >= 8 ? `<div class="meta">chance ${Math.max(15, 68 - (it.plus - 8) * 8)}% · protections ${S.protect}</div>` : "";
  popup(`<img src="${iconFor(it)}" style="width:42px;float:right;image-rendering:pixelated">
  <div class="${RARITY[it.rar].k}" style="font-size:13px">${it.name}${it.plus ? " +" + it.plus : ""}</div>
  <div class="meta">${RARITY[it.rar].name} ${it.slot} · ilvl ${it.ilvl}</div>
  <div style="margin:8px 0">${it.affixes.map((f) => `<div class="aff">${affLabel(f)}</div>`).join("")}</div>
  ${cmp}${risk}
  <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">
   ${equipped || inStash ? "" : `<button class="btn go" data-eqp="${it.uid}">Equip</button>`}
   <button class="btn" data-enh="${it.uid}" ${S.gold < c || it.plus >= 15 ? "disabled" : ""}>Enhance ${c}g</button>
   ${S.inHub && !equipped ? `<button class="btn" data-move="${it.uid}">${inStash ? "Withdraw" : "Deposit"}</button>` : ""}
   ${equipped ? "" : `<button class="btn" data-slv="${it.uid}">Salvage</button>`}
   <button class="btn" data-act="popclose">Close</button></div>`);
}

export function equip(uid: number): void {
  const it = S.bag.find((i) => i.uid === uid);
  if (!it) return;
  const cur = S.eq[it.slot];
  if (cur) S.bag.push(cur);
  S.eq[it.slot] = it;
  S.bag = S.bag.filter((b) => b.uid !== uid);
  toast("Equipped " + it.name);
  paintAll();
}

export function salvage(it: Item | undefined): void {
  if (!it) return;
  const t = matTier(it);
  const n = RARITY[it.rar].mat + it.plus;
  S.mats[t] += n;
  S.bag = S.bag.filter((b) => b.uid !== it.uid);
  S.stash = S.stash.filter((b) => b.uid !== it.uid);
  toast("+" + n + " T" + t + " materials");
  paintAll();
}

export function moveItem(uid: number): void {
  const inBag = S.bag.find((i) => i.uid === uid);
  if (inBag) {
    if (S.stash.length >= S.STASHMAX) return toast("Stash full.");
    S.stash.push(inBag);
    S.bag = S.bag.filter((b) => b.uid !== uid);
    toast("Deposited.");
  } else {
    const it = S.stash.find((i) => i.uid === uid);
    if (!it) return;
    if (S.bag.length >= S.BAGMAX) return toast("Bag full.");
    S.bag.push(it);
    S.stash = S.stash.filter((b) => b.uid !== uid);
    toast("Withdrawn.");
  }
  ($("pop") as HTMLElement).classList.remove("on");
  paintAll();
}

export function enhance(it: Item | undefined): void {
  if (!it) return;
  const c = Math.round(40 * Math.pow(1.6, it.plus) * (1 + it.ilvl * 0.3));
  if (S.gold < c) return toast("Not enough gold.");
  if (it.plus >= 15) return toast("Max.");
  S.gold -= c;
  if (it.plus < 8) {
    it.plus++;
    toast("→ +" + it.plus);
  } else {
    const ch = Math.max(15, 68 - (it.plus - 8) * 8);
    if (Math.random() * 100 < ch) {
      it.plus++;
      toast("Success → +" + it.plus);
    } else if (S.protect > 0) {
      S.protect--;
      toast("Failed. Protection consumed.");
    } else {
      it.plus = Math.max(8, it.plus - 1);
      toast("Failed. Fell to +" + it.plus);
    }
  }
  paintAll();
  openItem(it.uid);
}

export function reroll(it: Item, i: number): void {
  const t = matTier(it);
  const cost = 5 + it.plus * 2;
  const f = it.affixes[i];
  if (f.lock) return toast("Locked.");
  if (S.mats[t] < cost) return toast("Need " + cost + " T" + t + ".");
  S.mats[t] -= cost;
  f.val = rollAff(AFFIXES.find((a) => a.id === f.id)!, it.ilvl);
  toast(affLabel(f));
  paintAll();
}

export function lockAff(it: Item, i: number): void {
  const f = it.affixes[i];
  if (f.lock) {
    f.lock = false;
    paintAll();
    toast("Unlocked.");
    return;
  }
  if (S.shard < 1) return toast("Need 1 shard.");
  S.shard--;
  f.lock = true;
  paintAll();
  toast("Locked.");
}

export function upTier(it: Item | undefined): void {
  if (!it) return;
  if (it.rar >= 3) return toast("Already Relic.");
  const t = matTier(it);
  const cost = 16 * (it.rar + 1);
  if (S.mats[t] < cost) return toast("Need " + cost + " T" + t + ".");
  if (S.shard < 3) return toast("Need 3 shards.");
  S.mats[t] -= cost;
  S.shard -= 3;
  it.rar++;
  const used = it.affixes.map((f) => f.id);
  const pool = AFFIXES.filter((a) => !used.includes(a.id));
  if (pool.length) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    it.affixes.push({ id: a.id, val: rollAff(a, it.ilvl), lock: false });
  }
  toast("Now " + RARITY[it.rar].name);
  paintAll();
}

export function takeNode(id: string): void {
  const ab = abList().find((a) => abNodes(a).some((n) => n.id === id));
  if (!ab) return;
  if (S.lv < ab.lvl) return toast("Ability locked.");
  if (S.taken[id]) return toast("Already taken.");
  if (S.pts <= 0) return toast("No points.");
  const ti = ab.up.findIndex((t) => t.some((n) => n.id === id));
  if (!tierOpen(ab, ti)) return toast("Take " + Math.ceil(ab.up[ti - 1].length / 2) + " from tier " + ti + " first.");
  S.taken[id] = 1;
  S.pts--;
  const n = abNodes(ab).find((x) => x.id === id)!;
  toast(n.n + " learned.");
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
    toast(ab.name.replace("\n", " ") + " equipped.");
  }
  S.selAb = id;
  paintTree();
}

export const closeBtn = (): string => '<button class="btn wide" data-act="popclose" style="margin-top:10px">Close</button>';
export function popup(h: string): void {
  $("popin").innerHTML = h;
  $("pop").classList.add("on");
}
