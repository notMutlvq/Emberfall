/* ===================== hud =====================
 * In-game DOM overlay: ability bar, bars, toasts, loot log.
 * Direct DOM mutation, built once and mutated per-frame — never rebuilt
 * inside the render loop (see engine.ts / render.ts). Ported verbatim.
 */
import { S, W, $, type Stats } from "./core.ts";
import { CLASSES } from "./classes.ts";
import { abById, abMods, abCost } from "./abilities.ts";
import { stats } from "./items.ts";
import { xpNeed } from "./core.ts";
import { t } from "../i18n/index.ts";

interface SkillBtn {
  b: HTMLElement;
  cd: HTMLElement;
  lb: HTMLElement;
}
let SKB: SkillBtn[] = [];

export function buildSkills(): void {
  $("skills").innerHTML = S.slots
    .map((id, i) => {
      const ab = id ? abById(id) : null;
      return `<button class="sk e-${ab ? ab.el : "none"}" data-sk="${i}" ${ab ? "" : 'style="opacity:.3"'}>
   <div class="cd"></div>${ab ? `<span class="mp">${abCost(ab)}</span>` : ""}<span class="lb">${ab ? ab.name.replace("\n", "<br>") : "—"}</span></button>`;
    })
    .join("");
  SKB = [...document.querySelectorAll<HTMLElement>(".sk")].map((b) => ({
    b,
    cd: b.querySelector<HTMLElement>(".cd")!,
    lb: b.querySelector<HTMLElement>(".lb")!,
  }));
}

let hudT = 0;
let hudSt: Stats | null = null;

export function paintHud(force?: boolean): void {
  const now = performance.now();
  if (force || !hudSt || now - hudT > 150) {
    hudT = now;
    hudSt = stats();
    paintHudSlow(hudSt);
  }
  const st = hudSt;
  $("hpbar").style.width = Math.max(0, (S.hp / st.hp) * 100) + "%";
  $("mpbar").style.width = Math.max(0, (S.mp / st.mana) * 100) + "%";
  S.slots.forEach((id, i) => {
    const o = SKB[i];
    if (!o) return;
    const ab = id ? abById(id) : null;
    if (!ab) {
      o.cd.style.height = "0%";
      return;
    }
    const m = abMods(ab);
    const cd = ab.cd * (1 - Math.min(60, m.cd) / 100);
    const rem = Math.max(0, (ab.until || 0) - now);
    o.cd.style.height = (rem / cd) * 100 + "%";
    o.b.classList.toggle("nomana", S.mp < abCost(ab));
    const txt = rem ? (rem / 1000).toFixed(1) : ab.name.replace("\n", "<br>");
    if (o.lb.innerHTML !== txt) o.lb.innerHTML = txt;
  });
}

function paintHudSlow(st: Stats): void {
  const Z = W.Z;
  $("xpbar").style.width = (S.xp / xpNeed(S.lv)) * 100 + "%";
  $("pgold").textContent = String(Math.max(0, Math.round(S.gold)));
  $("pshard").textContent = String(S.shard);
  $("zonename").textContent = Z.d.name;
  $("zonemeta").textContent = t("metaTheClass", {
    name: S.name,
    cls: CLASSES[S.cls!].name,
    lv: S.lv,
    hp: Math.round(Math.max(0, S.hp)),
    maxhp: Math.round(st.hp),
    mp: Math.round(S.mp),
    maxmp: Math.round(st.mana),
  });
  $("objective").textContent = Z.hub
    ? t("objCamp")
    : Z.portal
      ? t("objPortal")
      : Z.bossUp
        ? t("objBoss", { boss: Z.d.boss })
        : t("objClear", { k: Z.killed, n: Z.total });
  const pb = $("potion") as HTMLButtonElement;
  pb.textContent = String(S.pots);
  pb.disabled = S.pots <= 0;
}

export function lootMsg(t: string): void {
  const l = $("loot");
  const d = document.createElement("div");
  d.textContent = t;
  l.appendChild(d);
  setTimeout(() => d.remove(), 3000);
  while (l.children.length > 6) l.removeChild(l.firstChild!);
}

let tt: ReturnType<typeof setTimeout> | undefined;
export function toast(t: string): void {
  const e = $("toast");
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => e.classList.remove("on"), 1600);
}
