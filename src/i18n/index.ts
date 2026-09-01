/* i18n entry point. Locale is hardcoded to Arabic ahead of stage 5, which
 * is where this actually gets wired into the UI (see build brief §7) —
 * stage 1's DOM still carries its ported inline English strings.
 */
import { en, type DictKey } from "./en.ts";
import { ar } from "./ar.ts";

const dict = { en, ar } as const;
export type Locale = keyof typeof dict;

let locale: Locale = "ar";
export function setLocale(l: Locale): void {
  locale = l;
}
export function t(key: DictKey): string {
  return dict[locale][key];
}
