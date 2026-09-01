/* ===================== boot =====================
 * Stage 1: no auth yet — straight to the class-pick screen, same as the
 * prototype. Waits on assets, then builds the menu; engine.ts's own
 * top-level listeners are wired the moment it's imported (which menu.ts
 * pulls in transitively via beginRun -> startLoop).
 */
import { whenAssetsReady } from "./game/assets.ts";
import { buildMenu } from "./ui/menu.ts";

whenAssetsReady().then(buildMenu);
