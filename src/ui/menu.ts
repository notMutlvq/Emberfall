/* ===================== menu =====================
 * Name + class pick screen. Stage 1: this is the whole "menu" — the main
 * menu with account/scoreboard lands in later stages.
 * Ported verbatim from emberfall-v9.html.
 */
import { S, $, type ClassKey } from "../game/core.ts";
import { CLASSES } from "../game/classes.ts";
import { heroPortrait } from "../game/assets.ts";
import { toast, lootMsg } from "../game/hud.ts";
import { newRunState } from "../game/state.ts";
import { resize } from "../game/render.ts";
import { startLoop } from "../game/engine.ts";
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
     life ${bar3(c.bars.life, "var(--blood)")}<b>${Math.round(70 * c.base.hp)}</b><br>
     damage ${bar3(c.bars.damage, "var(--gold)")}<b>${c.base.atk.toFixed(2)}x</b><br>
     mana ${bar3(c.bars.mana, "var(--arc)")}<b>${c.base.mana} (+${c.base.regen}/s)</b>
    </div></div></div>`,
    )
    .join("");
}

export function selectCls(k: ClassKey): void {
  S.pend = k;
  document.querySelectorAll<HTMLElement>(".cchoice").forEach((c) => c.classList.toggle("on", c.dataset.cls === k));
}

export function beginRun(): void {
  if (!S.pend) return toast("Choose a path first.");
  const nm = ((($("pname") as HTMLInputElement).value || "") as string).trim();
  if (!nm) return toast("Enter a name.");
  S.name = nm;
  S.cls = S.pend;
  showScreen("game");
  newRunState();
  resize();
  lootMsg("Ember Camp. Take a bounty, then the gate.");
  startLoop();
}
