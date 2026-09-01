/* Main menu shell. Stage 3: Resume run + best score. Stage 4: the global
 * leaderboard (top 20, my best, my rank), filterable by class. The whole
 * panel is placeholder English — stage 5 does the Arabic/RTL rebuild.
 */
import { $, type ClassKey } from "../game/core.ts";
import { online } from "../net/supabase.ts";
import { signOut, type Profile } from "../net/auth.ts";
import { hasSavedRun, bestScore } from "../game/save.ts";
import { fetchTopRuns, fetchRank, type BoardRow } from "../net/leaderboard.ts";
import { showScreen } from "./screens.ts";

const CLASS_LABEL: Record<string, string> = { warrior: "Warrior", ranger: "Ranger", mage: "Mage" };
let boardFilter: ClassKey | null = null;
let boardToken = 0;

export function initMainMenu(onNewRun: () => void, onLoggedOut: () => void, onResume: () => void): void {
  $("mm-newrun").addEventListener("click", onNewRun);
  $("mm-resume").addEventListener("click", onResume);
  $("mm-logout").addEventListener("click", async () => {
    ($("mm-logout") as HTMLButtonElement).disabled = true;
    await signOut();
    ($("mm-logout") as HTMLButtonElement).disabled = false;
    onLoggedOut();
  });
  document.querySelectorAll<HTMLElement>("#mm-board-tabs [data-board]").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll<HTMLElement>("#mm-board-tabs [data-board]").forEach((x) => x.classList.toggle("on", x === t));
      const b = t.dataset.board;
      boardFilter = b && b !== "all" ? (b as ClassKey) : null;
      void refreshBoard();
    });
  });
}

export function showMainMenu(p: Profile | null): void {
  $("mm-user").textContent = p ? `— ${p.username} —` : "— offline —";
  ($("mm-logout") as HTMLElement).style.display = online && p ? "block" : "none";
  ($("mm-resume") as HTMLElement).style.display = hasSavedRun() ? "block" : "none";
  void refreshBoard();
  showScreen("menu");
}

function rowHTML(r: BoardRow, i: number): string {
  const d = new Date(r.date);
  const when = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  return `<div class="qrow">
    <span>${i + 1}. ${r.username} · ${CLASS_LABEL[r.cls] ?? r.cls} · lv${r.level}</span>
    <b>${r.score}</b><span class="meta"> ${when}</span></div>`;
}

async function refreshBoard(): Promise<void> {
  const best = bestScore();
  $("mm-rank").textContent = best ? `Your best ${best}` : "";

  if (!online) {
    $("mm-board").textContent = "Sign in to see the global leaderboard.";
    return;
  }

  const token = ++boardToken;
  $("mm-board").textContent = "Loading…";

  const [rows, rank] = await Promise.all([
    fetchTopRuns(boardFilter),
    best ? fetchRank(best) : Promise.resolve(null),
  ]);
  if (token !== boardToken) return; // a newer refresh already ran

  if (best) $("mm-rank").textContent = `Your best ${best}` + (rank ? ` · rank #${rank}` : "");
  $("mm-board").innerHTML = rows.length
    ? rows.map(rowHTML).join("")
    : '<span class="meta">No runs yet — be the first.</span>';
}
