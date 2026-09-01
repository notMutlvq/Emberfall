# Emberfall — Arabic glossary (stage 5)

Every player-facing string is Arabic. This table is the terminology I chose
so you can correct it. Where a string lives:

- **UI chrome / messages** → `src/i18n/ar.ts` (mirrored in `en.ts`)
- **Game content names** → Arabic in place in the data tables
  (`src/game/core.ts`, `classes.ts`, `abilities.ts`, `zones.ts`)

Fix a term in one place and it updates everywhere it is used.

## Core terms

| English | العربية | note |
|---|---|---|
| Emberfall (title) | سقوط الجمر | logo stays Latin "EMBERFALL" |
| New run | جولة جديدة | |
| Resume run | متابعة الجولة | |
| Log in / Sign up | تسجيل الدخول / إنشاء حساب | |
| Username / Password | اسم المستخدم / كلمة المرور | |
| Leaderboard | لوحة المتصدرين | |
| Score | النتيجة | |
| Best run / Your best | أفضل جولة / أفضل نتيجة لك | |
| Rank | الترتيب | |
| Level | المستوى | |
| Life / Mana | الصحة / المانا | |
| Damage / Armour / Resistance | الضرر / الدرع / المقاومة | |
| Crit chance | فرصة حاسمة | |
| Leech | امتصاص | |
| Move speed / Attack speed | سرعة الحركة / سرعة الهجوم (تسريع) | HUD uses تسريع for haste |
| Cooldown | الانتظار | node text: "-N% انتظار" |
| Bag / Stash | الحقيبة / المخزن | |
| Workbench | طاولة الصناعة | |
| Abilities | القدرات | |
| Upgrade / Tier | ترقية / المرتبة | |
| Equip / Salvage | تجهيز / تفكيك | |
| Reroll / Lock / Enhance | إعادة توزيع / تثبيت / تقوية | |
| Materials / Shard / Gold | المواد / شظية / الذهب | crafting tiers shown as م1 / م2 / م3 |
| Potion | جرعة | |
| Zone | منطقة | |
| Explore / Craft / Atlas | استكشاف / الصناعة / الأطلس | nav bar |
| Bounty / Quartermaster | مهمة / أمين المؤن | |
| Portal home is open | بوابة العودة مفتوحة | |
| Ember Camp | مخيّم الجمر | |
| You fell / A new best | لقد سقطت / أفضل نتيجة جديدة | death screen |

## Classes

| English | العربية |
|---|---|
| Emberblade (warrior) | نصل الجمر |
| Frostwarden (ranger) | حارس الصقيع |
| Stormcaller (mage) | مستدعي العاصفة |

## Zones & bosses

| Zone | المنطقة | Boss | الزعيم |
|---|---|---|---|
| Ashen Hollow | جوف الرماد | Hollow Warden | حارس الجوف |
| Saltmarsh Ruin | خراب المستنقع المالح | Drowned Priest | الكاهن الغريق |
| Cinder Vault | قبو الجمر | Vault Construct | آلة القبو |
| Weeping Spire | البرج الباكي | Spire Seraph | سيراف البرج |
| Emberfall | سقوط الجمر | The Last Ember | الجمرة الأخيرة |

## Rarities

| English | العربية |
|---|---|
| Common / Fine / Rare / Relic | عادي / جيّد / نادر / أثري |

## Item bases

| Slot | English → العربية |
|---|---|
| weapon | Rusted Blade → نصل صدئ · Notched Axe → فأس مثلوم · Bone Cleaver → ساطور عظمي · Ember Sabre → سيف الجمر |
| armor | Torn Hide → جلد ممزّق · Iron Plate → درع حديدي · Ashwood Mail → زرد خشب الرماد · Emberweave → نسيج الجمر |
| ring | Copper Band → خاتم نحاسي · Sigil Ring → خاتم الطلسم · Ashen Loop → حلقة رمادية · Ember Signet → خاتم الجمر |

## Affixes

| English | العربية |
|---|---|
| attack / armour / life | هجوم / درع / صحة |
| crit chance / leech / move speed | فرصة حاسمة / امتصاص / سرعة حركة |
| fire / cold / lightning damage | ضرر ناري / ضرر جليدي / ضرر صاعق |
| resistance / maximum mana / mana regen | مقاومة / أقصى مانا / تجدد المانا |

## Abilities (names)

| Class | English → العربية |
|---|---|
| warrior | Cleave → شقّ · Fire Brand → وصمة اللهب · Rally → نداء · Shield Charge → اندفاع الترس · Ground Slam → صدع الأرض · Immolate → إحراق |
| ranger | Volley → وابل · Frost Shot → طلقة صقيع · Roll → تدحرج · Ice Nova → انفجار جليدي · Arrow Rain → مطر السهام · Hunter Focus → تركيز الصياد |
| mage | Chain → سلسلة · Meteor → نيزك · Blink → ومضة · Frost Orb → كرة صقيع · Storm Field → حقل عاصف · Arcane Surge → دفقة سحرية |

Generic upgrade nodes: Force → قوة · Tempo → إيقاع · Precision → دقة · Vigor → عافية · Might → بطش.
The 36 signature-node names/descriptions are in `src/game/abilities.ts`.

## Notes on rendering

- `<html lang="ar" dir="rtl">`. The canvas game world (`#cv`) is `dir="ltr"`
  and never mirrors — joystick stays right, abilities stay left (ergonomic).
- Numerals are Western digits everywhere, including menus (per the brief).
- Font: **Tajawal** for Arabic; **Silkscreen** kept only for the Latin
  "EMBERFALL" logo.
- Combat damage numbers on the canvas are LTR Western digits, unchanged.
