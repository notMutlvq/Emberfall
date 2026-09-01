/* ===================== engine =====================
 * Frame loop, joystick + keyboard input, and the delegated tap dispatcher
 * that wires every `data-*` control in the DOM to a game/UI action.
 * Ported verbatim from emberfall-v9.html. Idle/offline farming taps
 * (`data-idle`, `data-off`) intentionally dropped — see memory:
 * emberfall-locked-decisions #3.
 */
import { S, joy, $, type ClassKey } from "./core.ts";
import { update, keys, useSlot, drinkPotion } from "./combat.ts";
import { draw } from "./render.ts";
import { interact, takeQuest } from "./quests.ts";
import {
  go, sheetOpen, setSlot, chooseAb, switchBagTab, takeNode, equip, salvage,
  moveItem, enhance, reroll, lockAff, upTier, openItem, paintCraft,
} from "../ui/sheets.ts";
import { allItems } from "./items.ts";
import { toast } from "./hud.ts";
import { newRun, enterZone } from "./state.ts";
import { selectCls, beginRun } from "../ui/menu.ts";
import { saveRun, isRunActive } from "./save.ts";
import { t as tr } from "../i18n/index.ts";

/* ---------- frame loop ---------- */
let last = performance.now();
let booted = false;
let lastSave = 0;

function frame(t: number): void {
  const dt = Math.min(0.034, (t - last) / 1000);
  last = t;
  if (S.cls && !sheetOpen()) update(dt);
  if (S.cls) draw();
  if (isRunActive() && t - lastSave > 4000) {
    lastSave = t;
    saveRun();
  }
  requestAnimationFrame(frame);
}

/* Flush the run mirror the moment the tab is backgrounded or closed — on
 * mobile that is the usual way a session ends (home button, call, lock). */
addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveRun();
});
addEventListener("pagehide", () => saveRun());

export function startLoop(): void {
  if (booted) return;
  booted = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

/* ---------- keyboard ---------- */
addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement | null;
  if (target && target.id === "pname") return;
  const k = e.key.toLowerCase();
  if ("wasd".includes(k)) keys.add(k);
  if ("1234".includes(k)) useSlot(Number(k) - 1);
  if (k === "q") drinkPotion();
  if (k === "e" && window.__near) interact(window.__near);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

/* ---------- joystick (right side; abilities stay left — ergonomic, not RTL) ---------- */
const stick = $("stick");
const sbase = $("sbase");
const sknob = $("sknob");
let sid: number | null = null;
let sx = 0;
let sy = 0;

function pointOf(e: TouchEvent | MouseEvent): { clientX: number; clientY: number } {
  return "touches" in e && e.touches.length ? e.touches[0] : (e as MouseEvent);
}

function sStart(e: TouchEvent | MouseEvent): void {
  const t = pointOf(e);
  const r = stick.getBoundingClientRect();
  sx = t.clientX - r.left;
  sy = t.clientY - r.top;
  sid = 1;
  stick.classList.add("on");
  sbase.style.left = sx - 52 + "px";
  sbase.style.top = sy - 52 + "px";
  sknob.style.left = sx - 22 + "px";
  sknob.style.top = sy - 22 + "px";
  e.preventDefault();
}
function sMove(e: TouchEvent | MouseEvent): void {
  if (!sid) return;
  const t = pointOf(e);
  const r = stick.getBoundingClientRect();
  const ox = t.clientX - r.left - sx;
  const oy = t.clientY - r.top - sy;
  const d = Math.hypot(ox, oy) || 1;
  const ux = ox / d;
  const uy = oy / d;
  const cl = Math.min(48, d);
  sknob.style.left = sx + ux * cl - 22 + "px";
  sknob.style.top = sy + uy * cl - 22 + "px";
  const mag = d < 9 ? 0 : 1;
  joy.dx = ux * mag;
  joy.dy = uy * mag;
  e.preventDefault();
}
function sEnd(): void {
  sid = null;
  joy.dx = joy.dy = 0;
  stick.classList.remove("on");
}
stick.addEventListener("touchstart", sStart as EventListener, { passive: false });
stick.addEventListener("touchmove", sMove as EventListener, { passive: false });
stick.addEventListener("touchend", sEnd);
stick.addEventListener("touchcancel", sEnd);
stick.addEventListener("mousedown", sStart as EventListener);
addEventListener("mousemove", sMove as EventListener);
addEventListener("mouseup", sEnd);

/* ---------- tap dispatch ---------- */
const SEL =
  "[data-go],[data-sk],[data-uid],[data-eqp],[data-slv],[data-enh],[data-move],[data-enter]," +
  "[data-craft],[data-tier],[data-aff],[data-node],[data-bt],[data-take],[data-cls],[data-act],[data-slot],[data-ab]";

let fastTap = 0;
function fastFire(e: Event): void {
  const b = (e.target as Element).closest<HTMLElement>('[data-sk],[data-act="potion"],[data-act="interact"]');
  if (!b) return;
  e.preventDefault();
  fastTap = Date.now();
  if (b.dataset.sk !== undefined) useSlot(+b.dataset.sk);
  else if (b.dataset.act === "potion") drinkPotion();
  else interact(window.__near);
}

let lastTap = 0;
function handleTap(e: Event): void {
  const t = (e.target as Element).closest<HTMLElement>(SEL);
  if (!t) return;
  const now = Date.now();
  if (now - lastTap < 250 && e.type === "click") return;
  if (e.type === "touchend") {
    lastTap = now;
    e.preventDefault();
  }
  const d = t.dataset;
  if ((d.sk !== undefined || d.act === "potion" || d.act === "interact") && Date.now() - fastTap < 500) return;

  if (d.act === "newrun") return newRun();
  if (d.act === "popclose") return void $("pop").classList.remove("on");
  if (d.act === "potion") return drinkPotion();
  if (d.act === "interact") return interact(window.__near);
  if (d.act === "salvageall") {
    const j = S.bag.filter((i) => i.rar === 0);
    if (!j.length) return void toast(tr("noCommons"));
    j.slice().forEach(salvage);
    return void toast(tr("salvagedN", { n: j.length }));
  }
  if (d.cls) return selectCls(d.cls as ClassKey);
  if (d.act === "begin") return beginRun();
  if (d.go !== undefined) return go(d.go);
  if (d.sk !== undefined) return useSlot(+d.sk);
  if (d.slot !== undefined) return setSlot(+d.slot);
  if (d.ab) return chooseAb(d.ab);
  if (d.take !== undefined) return takeQuest(+d.take);
  if (d.bt) return switchBagTab(d.bt as "bag" | "stash");
  if (d.node) return takeNode(d.node);
  if (d.eqp) {
    equip(+d.eqp);
    $("pop").classList.remove("on");
    return;
  }
  if (d.slv) {
    salvage([...S.bag, ...S.stash].find((i) => i.uid === +d.slv!));
    $("pop").classList.remove("on");
    return;
  }
  if (d.move) return moveItem(+d.move);
  if (d.enh) return enhance([...allItems(), ...S.stash].find((i) => i.uid === +d.enh!));
  if (d.enter !== undefined) return enterZone(+d.enter);
  if (d.craft) {
    S.craftMode = d.craft as "reroll" | "lock" | "tier";
    document.querySelectorAll<HTMLElement>("[data-craft]").forEach((x) => x.classList.toggle("on", x.dataset.craft === d.craft));
    return paintCraft();
  }
  if (d.tier) return upTier(allItems().find((i) => i.uid === +d.tier!));
  if (d.aff !== undefined) {
    const it = allItems().find((i) => i.uid === S.craftSel);
    if (!it) return;
    if (S.craftMode === "reroll") return reroll(it, +d.aff);
    if (S.craftMode === "lock") return lockAff(it, +d.aff);
    return;
  }
  if (d.uid) {
    if ($("sh-craft").classList.contains("on")) {
      S.craftSel = +d.uid;
      return paintCraft();
    }
    return openItem(+d.uid);
  }
}
document.addEventListener("touchstart", fastFire, { passive: false });
document.addEventListener("touchend", handleTap, { passive: false });
document.addEventListener("click", handleTap);
$("pop").addEventListener("click", (e) => {
  if ((e.target as HTMLElement).id === "pop") $("pop").classList.remove("on");
});
