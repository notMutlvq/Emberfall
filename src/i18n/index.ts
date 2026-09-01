/* i18n entry point. The game ships in Arabic (`<html lang="ar" dir="rtl">`).
 *
 * Stage-5 split:
 *  - UI chrome, buttons, tooltips, messages, templated player feedback →
 *    the flat dictionaries in en.ts / ar.ts, reached through t().
 *  - Game *content* names — classes, abilities + upgrade nodes, zones,
 *    item bases, rarities, affixes — are Arabic directly in the data
 *    tables (game/core.ts, classes.ts, abilities.ts). They are 1:1 with
 *    ids, numeric-templated, and read better colocated with their data;
 *    the English originals live in git history and emberfall-v9.html.
 *
 * en.ts is the type source and a debugging reference; ar is what renders.
 */
import { en, type DictKey } from "./en.ts";
import { ar } from "./ar.ts";

const dict = { en, ar } as const;
export type Locale = keyof typeof dict;

const LKEY = "emberfall.locale.v1";
let locale: Locale = "ar";
try {
  const s = localStorage.getItem(LKEY);
  if (s === "ar" || s === "en") locale = s;
} catch {
  /* ignore */
}

/** Persist the choice. The caller reloads — `dir`/`lang` on <html> and every
 *  rendered string are set at boot, not swapped live. */
export function setLocale(l: Locale): void {
  locale = l;
  try {
    localStorage.setItem(LKEY, l);
  } catch {
    /* ignore */
  }
}
export function getLocale(): Locale {
  return locale;
}

export type Vars = Record<string, string | number>;

export function t(key: DictKey, vars?: Vars): string {
  let s: string = dict[locale][key] ?? dict.en[key] ?? key;
  if (vars) {
    for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
  }
  return s;
}

/** Fill every element carrying data-i18n / data-i18n-ph with its string,
 *  and set <html lang/dir> for the active locale. Call once at boot. */
export function applyStaticI18n(root: ParentNode = document): void {
  if (root === document) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as DictKey;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((el) => {
    const key = el.dataset.i18nPh as DictKey;
    if (key) el.placeholder = t(key);
  });
}
