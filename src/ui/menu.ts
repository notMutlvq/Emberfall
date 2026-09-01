/* ===================== menu =====================
 * Name + class pick screen. Stage 1: this is the whole "menu" — the main
 * menu with account/scoreboard lands in later stages.
 * Ported verbatim from emberfall-v9.html.
 */
import { S, $, clamp, type ClassKey } from "../game/core.ts";
import { CLASSES } from "../game/classes.ts";
import { heroPortrait } from "../game/assets.ts";
import { toast, lootMsg, buildSkills } from "../game/hud.ts";
import { newRunState } from "../game/state.ts";
import { genHub, genZone } from "../game/zones.ts";
import { stats } from "../game/items.ts";
import { resize } from "../game/render.ts";
import { startLoop } from "../game/engine.ts";
import { loadRun, applyRun, setRunActive, saveRun } from "../game/save.ts";
import { t } from "../i18n/index.ts";
import { paintAll } from "./sheets.ts";
import { showScreen } from "./screens.ts";

function bar3(v: number, col: string): string {
  return `<span class="bar3"><i style="width:${v * 20}%;background:${col}"></i></span>`;
}

export function buildMenu(): void {
  $("picklist").innerHTML = (Object.entries(CLASSES) as [ClassKey, (typeof CLASSES)[ClassKey]][])
    .map(
      ([k, c]) =>
        `<div class="cchoice" data-cls="${k}"><img src="${heroPortrait(k)}" style="width:52px;image-rendering:pixelated">
   <div style="flex:1"><b>${c.name}</b><div class="d">${c.blurb}</div>
    <div class="cbars">
     ${t("barLife")} ${bar3(c.bars.life, "var(--blood)")}<b>${Math.round(70 * c.base.hp)}</b><br>
     ${t("barDamage")} ${bar3(c.bars.damage, "var(--gold)")}<b>${t("classMult", { v: c.base.atk.toFixed(2) })}</b><br>
     ${t("barMana")} ${bar3(c.bars.mana, "var(--arc)")}<b>${t("classMana", { mana: c.base.mana, regen: c.base.regen })}</b>
    </div></div></div>`,
    )
    .join("");
}

export function selectCls(k: ClassKey): void {
  S.pend = k;
  document.querySelectorAll<HTMLElement>(".cchoice").forEach((c) => c.classList.toggle("on", c.dataset.cls === k));
}

export function beginRun(): void {
  if (!S.pend) return toast(t("pickFirst"));
  const nm = ((($("pname") as HTMLInputElement).value || "") as string).trim();
  if (!nm) return toast(t("enterName"));
  S.name = nm;
  S.cls = S.pend;
  showScreen("game");
  newRunState();
  setRunActive(true);
  saveRun();
  resize();
  lootMsg(t("campWelcome"));
  startLoop();
}

/* Restore an in-progress run from the localStorage mirror. The zone is
 * regenerated fresh and the player dropped at its entrance with the saved
 * HP — no mid-combat state is kept (locked decision #5). */
export function resumeRun(): void {
  const d = loadRun();
  if (!d) return toast(t("noRunResume"));
  applyRun(d);
  showScreen("game");
  if (S.zone < 0) genHub();
  else genZone(S.zone);
  const st = stats();
  S.hp = clamp(d.hp ?? st.hp, 1, st.hp);
  S.mp = st.mana;
  setRunActive(true);
  saveRun();
  buildSkills();
  resize();
  paintAll();
  lootMsg(t("runRestored"));
  startLoop();
}
