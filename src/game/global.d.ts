import type { Obj } from "./core.ts";
import type { QuestOffer } from "./quests.ts";

export {};

declare global {
  interface Window {
    __near: Obj | null;
    __offer?: QuestOffer[];
  }
}
