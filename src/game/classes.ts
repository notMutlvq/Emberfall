/* ===================== classes =====================
 * Class definitions and per-class stat identity. Ported verbatim.
 */
import { CHARS, type ClassKey } from "./core.ts";

export interface ClassDef {
  name: string;
  tile: number;
  blurb: string;
  base: {
    hp: number; atk: number; def: number; range: number;
    mana: number; regen: number; manaMul: number;
  };
  auto: "melee" | "shot";
  autoCd: number;
  bars: { life: number; damage: number; mana: number };
}

export const CLASSES: Record<ClassKey, ClassDef> = {
  warrior: {
    name: "نصل الجمر",
    tile: CHARS.warrior,
    blurb: "سيف. صحة عالية، ضربات ثقيلة، مانا قليلة جداً.",
    base: { hp: 1.5, atk: 1.25, def: 1.45, range: 1.25, mana: 45, regen: 3.2, manaMul: 1.0 },
    auto: "melee",
    autoCd: 0.78,
    bars: { life: 5, damage: 4, mana: 1 },
  },
  ranger: {
    name: "حارس الصقيع",
    tile: CHARS.ranger,
    blurb: "قوس. توازن بين الصحة والمانا، ضرر ثابت.",
    base: { hp: 1.05, atk: 1.05, def: 1.0, range: 6.5, mana: 85, regen: 5, manaMul: 1.35 },
    auto: "shot",
    autoCd: 0.6,
    bars: { life: 3, damage: 3, mana: 3 },
  },
  mage: {
    name: "مستدعي العاصفة",
    tile: CHARS.mage,
    blurb: "عصا. هشّ، مانا هائلة، أقوى التعاويذ.",
    base: { hp: 0.75, atk: 1.35, def: 0.75, range: 6, mana: 150, regen: 8, manaMul: 2.3 },
    auto: "shot",
    autoCd: 0.7,
    bars: { life: 1, damage: 5, mana: 5 },
  },
};
