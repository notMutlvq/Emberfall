/* Main menu shell. Stage 3: Resume run + best score. Stage 4: the global
 * leaderboard (top 20, my best, my rank), filterable by class. Stage 5:
 * strings through t(), RTL.
 */
import { $, type ClassKey } from "../game/core.ts";
import { CLASSES } from "../game/classes.ts";
import { online } from "../net/supabase.ts";
import { signOut, type Profile } from "../net/auth.ts";
import { hasSavedRun, bestScore } from "../game/save.ts";
import { fetchTopRuns, fetchRank, type BoardRow } from "../net/leaderboard.ts";
import { t } from "../i18n/index.ts";
import { showScreen } from "./screens.ts";

let boardFilter: ClassKey | null = null;
let boardToken = 0;

function clsName(k: string): string {
  return (CLASSES as Record<string, { name: string }>)[k]?.name ?? k;
}

export function initMainMenu(onNewRun: () => void, onLoggedOut: () => void, onResume: () => void): void {
  $("mm-newrun").addEventListener("click", onNewRun);
  $("mm-resume").addEventListener("click", onResume);
  $("mm-logout").addEventListener("click", async () => {
    ($("mm-logout") as HTMLButtonElement).disabled = true;
    await signOut();
    ($("mm-logout") as HTMLButtonElement).disabled = false;
    onLoggedOut();
  });
  document.querySelectorAll<HTMLElement>("#mm-board-tabs [data-board]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll<HTMLElement>("#mm-board-tabs [data-board]").forEach((x) => x.classList.toggle("on", x === tab));
      const b = tab.dataset.board;
      boardFilter = b && b !== "all" ? (b as ClassKey) : null;
      void refreshBoard();
    });
  });
}

export function showMainMenu(p: Profile | null): void {
  $("mm-user").textContent = p ? t("userTag", { name: p.username }) : t("offlineTag");
  ($("mm-logout") as HTMLElement).style.display = online && p ? "block" : "none";
  ($("mm-resume") as HTMLElement).style.display = hasSavedRun() ? "block" : "none";
  void refreshBoard();
  showScreen("menu");
}

function rowHTML(r: BoardRow, i: number): string {
  const d = new Date(r.date);
  const when = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  return `<div class="qrow">
    <span>${t("boardRow", { i: i + 1, name: r.username, cls: clsName(r.cls), level: r.level })}</span>
    <b>${r.score}</b><span class="meta"> ${when}</span></div>`;
}

async function refreshBoard(): Promise<void> {
  const best = bestScore();
  $("mm-rank").textContent = best ? t("yourBest", { score: best }) : "";

  if (!online) {
    $("mm-board").textContent = t("boardSignIn");
    return;
  }

  const token = ++boardToken;
  $("mm-board").textContent = t("boardLoading");

  const [rows, rank] = await Promise.all([
    fetchTopRuns(boardFilter),
    best ? fetchRank(best) : Promise.resolve(null),
  ]);
  if (token !== boardToken) return; // a newer refresh already ran

  if (best) {
    $("mm-rank").textContent = t("yourBest", { score: best }) + (rank ? t("rankSuffix", { rank }) : "");
  }
  $("mm-board").innerHTML = rows.length
    ? rows.map(rowHTML).join("")
    : `<span class="meta">${t("boardEmpty")}</span>`;
}
