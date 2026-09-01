/* Full-screen overlay switching: auth / main menu / class pick / in-game.
 * The death summary (#over) is a separate overlay managed by combat.die()
 * and state.newRun().
 */
import { $ } from "../game/core.ts";

export type Screen = "auth" | "menu" | "pick" | "game";

const IDS: Record<Exclude<Screen, "game">, string> = {
  auth: "auth",
  menu: "mainmenu",
  pick: "pick",
};

export function showScreen(s: Screen): void {
  for (const [key, id] of Object.entries(IDS)) {
    ($(id) as HTMLElement).style.display = s === key ? "flex" : "none";
  }
  // the in-game nav bar only makes sense once a run is going
  ($("nav") as HTMLElement).style.display = s === "game" ? "grid" : "none";
}
