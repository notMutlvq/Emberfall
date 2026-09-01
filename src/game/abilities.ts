/* ===================== abilities =====================
 * Ability data + nine-node upgrade trees (tiers 3/3/2/1) and the
 * derived-modifier helpers. Ported verbatim from emberfall-v9.html; the
 * display strings are Arabic in place (stage-5 note in src/i18n/index.ts).
 *
 * Tier N unlocks when ceil(prev tier size / 2) nodes are taken in tier N-1.
 */
import { S, type Ability, type AbNode, type AbMods, type GlobalMods, type ClassKey } from "./core.ts";
import { CLASSES } from "./classes.ts";

/* node helpers: generic + signature nodes */
const GEN = {
  dmg: (v: number): Omit<AbNode, "id"> => ({ n: "قوة", d: "+" + v + "% ضرر", m: { dmg: v } }),
  cdr: (v: number): Omit<AbNode, "id"> => ({ n: "إيقاع", d: "-" + v + "% انتظار", m: { cd: v } }),
  crit: (v: number): Omit<AbNode, "id"> => ({ n: "دقة", d: "+" + v + "% فرصة حاسمة", m: { gCrit: v } }),
  life: (v: number): Omit<AbNode, "id"> => ({ n: "عافية", d: "+" + v + "% صحة", m: { gHp: v } }),
  pow: (v: number): Omit<AbNode, "id"> => ({ n: "بطش", d: "+" + v + "% هجوم", m: { gAtk: v } }),
};

let NID = 0;
const nd = (o: Omit<AbNode, "id">): AbNode => ({ id: "n" + NID++, ...o });

function mkUp(
  s1: Omit<AbNode, "id">,
  s2: Omit<AbNode, "id">,
  s3: Omit<AbNode, "id">,
  cap: Omit<AbNode, "id">,
): AbNode[][] {
  return [
    [nd(GEN.dmg(12)), nd(GEN.cdr(10)), nd(s1)],
    [nd(GEN.dmg(16)), nd(GEN.crit(4)), nd(s2)],
    [nd(GEN.dmg(22)), nd(s3)],
    [nd(cap)],
  ];
}

export const ABIL: Record<ClassKey, Ability[]> = {
  warrior: [
    { id: "cleave", name: "شقّ", lvl: 1, type: "nova", el: "phys", cd: 4500, mult: 2.6, r: 2.3,
      up: mkUp(
        { n: "قوس واسع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "تمزيق", d: "+25% ضرر، ينزف", m: { dmg: 25, burn: 40 } },
        { n: "زخم", d: "-15% انتظار", m: { cd: 15 } },
        { n: "زوبعة", d: "يضرب مرتين", m: { hits: 1 } },
      ) },
    { id: "brand", name: "وصمة\nاللهب", lvl: 1, type: "nova", el: "fire", cd: 7500, mult: 2.3, r: 2.9,
      up: mkUp(
        { n: "جمر متّقد", d: "+40% ضرر حرق", m: { burn: 40 } },
        { n: "لهب أوسع", d: "+25% نطاق", m: { rad: 25 } },
        { n: "إشعال", d: "-18% انتظار", m: { cd: 18 } },
        { n: "حريق هائج", d: "ينتشر الحرق عند القتل", m: { spread: 1 } },
      ) },
    { id: "rally", name: "نداء", lvl: 3, type: "heal", el: "none", cd: 18000, heal: 0.32,
      up: mkUp(
        { n: "جرعة عميقة", d: "+35% شفاء", m: { heal: 35 } },
        { n: "نَفَس ثانٍ", d: "+8% صحة", m: { gHp: 8 } },
        { n: "إرادة حديدية", d: "+10% درع", m: { gArm: 10 } },
        { n: "لا ينكسر", d: "تنجو من ضربة قاتلة واحدة لكل منطقة", m: { guard: 1 } },
      ) },
    { id: "charge", name: "اندفاع\nالترس", lvl: 6, type: "dashHit", el: "phys", cd: 7000, mult: 2.2,
      up: mkUp(
        { n: "عَدْوٌ أطول", d: "+40% مسافة", m: { rad: 40 } },
        { n: "ارتطام ثقيل", d: "+30% ضرر", m: { dmg: 30 } },
        { n: "سحق", d: "يجمّد ما يصيبه", m: { addCold: 1 } },
        { n: "جبّار", d: "يضرب مرتين، -25% انتظار", m: { hits: 1, cd: 25 } },
      ) },
    { id: "slam", name: "صدع\nالأرض", lvl: 11, type: "ground", el: "phys", cd: 9000, mult: 3.0, r: 2.6,
      up: mkUp(
        { n: "خط الصدع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "ارتجاج", d: "يجمّد ما يصيبه", m: { addCold: 1 } },
        { n: "ارتداد", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "كارثة", d: "يضرب مرتين", m: { hits: 1 } },
      ) },
    { id: "immo", name: "إحراق", lvl: 17, type: "aura", el: "fire", cd: 16000, mult: 0.9, r: 2.6, dur: 7,
      up: mkUp(
        { n: "احتراق طويل", d: "+3ث مدة", m: { dur: 3 } },
        { n: "لَفْح", d: "+35% ضرر", m: { dmg: 35 } },
        { n: "نار عظيمة", d: "+30% نطاق", m: { rad: 30 } },
        { n: "سيّد الجمر", d: "+40% ضرر ناري أثناء التفعيل", m: { gFire: 40 } },
      ) },
  ],
  ranger: [
    { id: "volley", name: "وابل", lvl: 1, type: "multi", el: "phys", cd: 4500, mult: 1.2, n: 5, spread: 0.55,
      up: mkUp(
        { n: "أعمدة إضافية", d: "+2 سهم", m: { proj: 2 } },
        { n: "مُشوّك", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "اختراق", d: "تخترق السهام هدفاً إضافياً", m: { pierce: 1 } },
        { n: "عاصفة سهام", d: "+4 سهم", m: { proj: 4 } },
      ) },
    { id: "frost", name: "طلقة\nصقيع", lvl: 1, type: "shot", el: "cold", cd: 8000, mult: 2.3, pierce: 3,
      up: mkUp(
        { n: "قشعريرة عميقة", d: "يدوم التجميد +1.5ث", m: { chill: 1.5 } },
        { n: "شظية", d: "تخترق هدفين إضافيين", m: { pierce: 2 } },
        { n: "تحطيم", d: "+30% ضرر للمجمّدين", m: { vsChill: 30 } },
        { n: "سيّد الشتاء", d: "+50% ضرر جليدي", m: { gCold: 50 } },
      ) },
    { id: "roll", name: "تدحرج", lvl: 3, type: "dash", el: "none", cd: 6000,
      up: mkUp(
        { n: "تدحرج طويل", d: "+40% مسافة", m: { rad: 40 } },
        { n: "خِفّة", d: "+10% سرعة حركة", m: { gMove: 10 } },
        { n: "تعافٍ", d: "-20% انتظار", m: { cd: 20 } },
        { n: "تدحرج طيفي", d: "لا يمكن مسّك للحظة", m: { iframe: 1 } },
      ) },
    { id: "inova", name: "انفجار\nجليدي", lvl: 6, type: "nova", el: "cold", cd: 8000, mult: 2.5, r: 2.8,
      up: mkUp(
        { n: "صقيع أوسع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "برد قارس", d: "يدوم التجميد +1.5ث", m: { chill: 1.5 } },
        { n: "تجميد", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "جليد دائم", d: "يضرب مرتين", m: { hits: 1 } },
      ) },
    { id: "rain", name: "مطر\nالسهام", lvl: 11, type: "ground", el: "phys", cd: 10000, mult: 3.0, r: 2.6,
      up: mkUp(
        { n: "سقوط واسع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "أعمدة ثقيلة", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "بَرَد", d: "يجمّد المنطقة", m: { addCold: 1 } },
        { n: "جعبة لا تنفد", d: "يسقط مرتين", m: { hits: 1 } },
      ) },
    { id: "focus", name: "تركيز\nالصياد", lvl: 17, type: "aura", el: "none", cd: 18000, mult: 0, dur: 8,
      up: mkUp(
        { n: "أحدّ", d: "+8% فرصة حاسمة أثناء التفعيل", m: { gCrit: 8 } },
        { n: "تركيز أطول", d: "+3ث مدة", m: { dur: 3 } },
        { n: "سحب سريع", d: "+15% سرعة هجوم", m: { gAspd: 15 } },
        { n: "عين قاتلة", d: "+25% هجوم أثناء التفعيل", m: { gAtk: 25 } },
      ) },
  ],
  mage: [
    { id: "chain", name: "سلسلة", lvl: 1, type: "chain", el: "light", cd: 5000, mult: 2.0, jumps: 4,
      up: mkUp(
        { n: "تحميل زائد", d: "+2 قفزة", m: { jumps: 2 } },
        { n: "توصيل", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "مدى القوس", d: "+2 قفزة", m: { jumps: 2 } },
        { n: "سيّد العاصفة", d: "+50% ضرر صاعق", m: { gLight: 50 } },
      ) },
    { id: "meteor", name: "نيزك", lvl: 1, type: "ground", el: "fire", cd: 10000, mult: 2.9, r: 2.4,
      up: mkUp(
        { n: "ارتطام أوسع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "احتراق", d: "+50% ضرر حرق", m: { burn: 50 } },
        { n: "سقوط أسرع", d: "-18% انتظار", m: { cd: 18 } },
        { n: "كارثة", d: "يسقط مرتين", m: { hits: 1 } },
      ) },
    { id: "blink", name: "ومضة", lvl: 3, type: "blink", el: "light", cd: 7000,
      up: mkUp(
        { n: "خطوة بعيدة", d: "+45% مدى الومضة", m: { rad: 45 } },
        { n: "حماية", d: "+8% صحة", m: { gHp: 8 } },
        { n: "خطوة سريعة", d: "-20% انتظار", m: { cd: 20 } },
        { n: "طَيْف", d: "لا يمكن مسّك للحظة", m: { iframe: 1 } },
      ) },
    { id: "orb", name: "كرة\nصقيع", lvl: 6, type: "shot", el: "cold", cd: 8000, mult: 2.6, pierce: 4,
      up: mkUp(
        { n: "جليد كثيف", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "متمهّل", d: "يدوم التجميد +1.5ث", m: { chill: 1.5 } },
        { n: "تحطيم", d: "+30% ضرر للمجمّدين", m: { vsChill: 30 } },
        { n: "نهر جليدي", d: "تخترق كل شيء", m: { pierce: 6 } },
      ) },
    { id: "field", name: "حقل\nعاصف", lvl: 11, type: "ground", el: "light", cd: 11000, mult: 2.8, r: 2.8,
      up: mkUp(
        { n: "حقل واسع", d: "+30% نطاق", m: { rad: 30 } },
        { n: "شحنة ساكنة", d: "+25% ضرر", m: { dmg: 25 } },
        { n: "مشحون", d: "+6% فرصة حاسمة", m: { gCrit: 6 } },
        { n: "زوبعة", d: "يضرب مرتين", m: { hits: 1 } },
      ) },
    { id: "surge", name: "دفقة\nسحرية", lvl: 17, type: "aura", el: "light", cd: 18000, mult: 1.0, r: 2.4, dur: 7,
      up: mkUp(
        { n: "دفقة أطول", d: "+3ث مدة", m: { dur: 3 } },
        { n: "تضخيم", d: "+35% ضرر", m: { dmg: 35 } },
        { n: "دفقة واسعة", d: "+30% نطاق", m: { rad: 30 } },
        { n: "متعالٍ", d: "+20% هجوم أثناء التفعيل", m: { gAtk: 20 } },
      ) },
  ],
};

/* ---------- lookups ---------- */
export function abList(): Ability[] {
  return S.cls ? ABIL[S.cls] : [];
}
export function abById(id: string): Ability | undefined {
  return abList().find((a) => a.id === id);
}
export function abNodes(ab: Ability): AbNode[] {
  return ab.up.flat();
}
export function tierOpen(ab: Ability, ti: number): boolean {
  if (ti === 0) return true;
  const prev = ab.up[ti - 1];
  const need = Math.ceil(prev.length / 2);
  return prev.filter((n) => S.taken[n.id]).length >= need;
}

export function abCost(ab: Ability): number {
  const base = ({ 1: 10, 3: 15, 6: 20, 11: 26, 17: 34 } as Record<number, number>)[ab.lvl] || 16;
  return Math.round(base * CLASSES[S.cls!].base.manaMul);
}

/* ---------- derived modifiers ---------- */
export function abMods(ab: Ability | null | undefined): AbMods {
  const m: AbMods = {
    dmg: 0, cd: 0, rad: 0, proj: 0, pierce: 0, jumps: 0, burn: 0, chill: 0, hits: 0, heal: 0, dur: 0,
    vsChill: 0, addCold: 0, spread: 0, iframe: 0,
  };
  if (!ab) return m;
  abNodes(ab).forEach((n) => {
    if (!S.taken[n.id]) return;
    for (const k in n.m) if (k in m) (m as unknown as Record<string, number>)[k] += n.m[k];
  });
  return m;
}

export function globalMods(): GlobalMods {
  const g: GlobalMods = {
    gAtk: 0, gHp: 0, gCrit: 0, gMove: 0, gArm: 0, gAspd: 0, gFire: 0, gCold: 0, gLight: 0, guard: 0,
  };
  abList().forEach((ab) =>
    abNodes(ab).forEach((n) => {
      if (!S.taken[n.id]) return;
      for (const k in n.m) if (k in g) (g as unknown as Record<string, number>)[k] += n.m[k];
    }),
  );
  return g;
}

export interface AuraBonus {
  gAtk: number; gCrit: number; gAspd: number; gFire: number; gCold: number; gLight: number;
}
export function auraBonus(): AuraBonus {
  const b: AuraBonus = { gAtk: 0, gCrit: 0, gAspd: 0, gFire: 0, gCold: 0, gLight: 0 };
  for (const id in S.auras) {
    if (S.auras[id] <= 0) continue;
    const ab = abById(id);
    if (!ab) continue;
    abNodes(ab).forEach((n) => {
      if (!S.taken[n.id]) return;
      for (const k in n.m) if (k in b) (b as unknown as Record<string, number>)[k] += n.m[k];
    });
  }
  return b;
}
