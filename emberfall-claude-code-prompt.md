# Build brief — Emberfall (سقوط الجمر)

Paste this whole file into Claude Code as the opening message. Put `emberfall-v9.html` in the repo root first so it can read it.

---

## 1. What this is

I have a working single-file HTML prototype of a portrait mobile roguelike ARPG: `emberfall-v9.html`. Read it in full before writing anything. It is the **source of truth for all gameplay logic** — combat maths, ability system, item generation, crafting, zone generation, run scoring. Do not redesign the game. Port it.

I want to turn it into a real deployed web game that:

- I can open on my phone from a URL and play any time
- requires an account (username + password) to play
- records my best run and shows a global scoreboard on the main menu
- is entirely in **Arabic** with proper RTL layout
- can be shared with a link

I am the only developer. Optimise for something I can maintain alone, not for scale.

---

## 2. Stack

Use this stack unless you have a concrete reason against it — if you do, say so before writing code:

- **Vite + TypeScript**, no framework for the game itself. The game is a canvas render loop; React would fight it.
- **Preact or plain TS for the menu/UI shells** (auth screens, scoreboard). Keep the in-game HUD as direct DOM manipulation like the prototype does — it is already performance-tuned for this.
- **Supabase** for auth, database, and hosting-adjacent needs.
- **Netlify or Vercel** for static hosting. Free tier is fine.
- **No backend server of my own.** Supabase edge functions only where genuinely required.

### Why Supabase specifically

**Do not hand-roll authentication.** Do not write password hashing, session tokens, or a users table with a `password` column. Use Supabase Auth so passwords never touch my code. This is non-negotiable — flag it if any part of the plan drifts toward custom auth.

I want username + password login, not email. Supabase Auth is email-based, so implement the standard pattern:

- User registers with a username and password
- Store the username in a `profiles` table with a unique constraint, lowercase-normalised
- Internally create the auth user as `<username>@emberfall.local` (or similar synthetic domain)
- On login, look up the username → resolve to the synthetic email → sign in
- No email verification, no password reset by email (there is no real email). Instead: warn clearly on the signup screen that a forgotten password cannot be recovered, OR add an optional real email field for recovery. Recommend which and implement it.

---

## 3. Repo structure

```
/src
  /game
    engine.ts        loop, camera, input, collision
    state.ts         run state, save/load
    classes.ts       class definitions, stats
    abilities.ts     ability data + upgrade trees
    items.ts         generation, affixes, crafting, enhancement
    zones.ts         procedural generation
    combat.ts        damage, status effects, AI
    render.ts        canvas drawing
    hud.ts           in-game DOM overlay
  /ui
    auth.ts          login / register screens
    menu.ts          main menu
    scoreboard.ts    leaderboard
    sheets.ts        bag, skills, craft, atlas panels
  /i18n
    ar.ts            all Arabic strings
    en.ts            English fallback (keep it, useful for debugging)
  /assets            packed PNGs, NOT base64
  main.ts
/supabase
  schema.sql
  policies.sql
index.html
```

Extract the assets out of the prototype's base64 blobs into real files in `/assets`. Vite will hash and cache them properly.

---

## 4. Game spec (port from the prototype — this is a checklist, not a redesign)

### Classes

Three, each with distinct life / damage / mana identity:

| Class | Life mult | Attack mult | Armour mult | Mana | Regen | Mana cost mult | Attack |
|---|---|---|---|---|---|---|---|
| Emberblade (نصل الجمر) | 1.50 | 1.25 | 1.45 | 45 | 3.2/s | 1.0 | melee, 1.25 range |
| Frostwarden (حارس الصقيع) | 1.05 | 1.05 | 1.00 | 85 | 5.0/s | 1.35 | ranged, 6.5 range |
| Stormcaller (مستدعي العاصفة) | 0.75 | 1.35 | 0.75 | 150 | 8.0/s | 2.3 | ranged, 6.0 range |

### Abilities

Six per class, unlocking at levels 1, 1, 3, 6, 11, 17. Four equipped slots, buttons on the **left** of the screen, joystick on the **right**. Each ability has a nine-node upgrade tree in four tiers of 3 / 3 / 2 / 1. **Tier N unlocks when you have taken at least ceil(previous tier size / 2) nodes in tier N−1.** One skill point per level.

Ability types already implemented: `nova`, `ground`, `shot`, `multi`, `chain`, `dash`, `blink`, `dashHit`, `heal`, `aura`. Keep `dash` (fast movement, walls block, still hittable) and `blink` (instant teleport, steps until blocked) as genuinely different mechanics.

### Items

Three slots. Affix pools are slot-specific:

- **weapon** — attack, crit, leech, fire/cold/lightning damage. Base value gives attack.
- **armour** — life, armour, resistance, max mana, mana regen, move speed. Base gives armour + life + a little resist.
- **ring** — rolls from both pools. Base gives life + mana + a little attack.

Four rarities (Common / Fine / Rare / Relic) with 1–4 affixes. Resistance is flat % damage reduction after armour, capped at 70%.

### Crafting and enhancement

Salvage into tiered materials. Reroll an affix with materials, lock an affix with a shard, upgrade rarity with materials + shards. Enhancement +1 to +15: guaranteed to +8, chance-based above with a protection item preventing loss.

### Zones and the run

Five zones, procedurally generated rooms and corridors, mobs in packs of 3–6 with elites and ranged casters, hidden chest, Lost Scholar NPC, boss with telegraphed slam and add spawns at 66% and 33% life. Ember Camp hub with stash, workbench, quartermaster bounties and gate.

### Roguelike loop

Death ends the run. Summary screen shows: level reached, where you died, zones cleared, deepest zone, kills / elites / bosses, gold earned, best item found, run time, and a score:

```
score = level*100 + kills*6 + elites*25 + bosses*250 + zonesCleared*300
```

The **stash persists between runs**. Everything else resets.

---

## 5. Accounts and persistence

### Tables

```sql
profiles          id (uuid, fk auth.users), username (citext unique), created_at
runs              id, user_id, class, level, kills, elites, bosses,
                  zones_cleared, deepest_zone, gold, duration_ms, score,
                  created_at
player_state      user_id (pk), stash (jsonb), best_score (int),
                  total_runs (int), updated_at
```

### Row Level Security — required, not optional

- `profiles`: anyone authenticated can read username + best score; only the owner can update their own row
- `runs`: insert only where `user_id = auth.uid()`; select is public (it's a leaderboard)
- `player_state`: full access only to the owner

Write the policies in `supabase/policies.sql` and make sure RLS is **enabled** on every table. A table with RLS off is world-writable.

### Save behaviour

- Stash syncs to `player_state` when the player returns to Ember Camp and on run end
- Current run state is kept in memory and mirrored to `localStorage` so a dropped connection or a phone lock doesn't lose the run
- On login, pull `player_state` and reconcile with any local save; prefer the server copy but ask the user if the local one is newer and materially different

---

## 6. Scoreboard

Main menu shows: top 20 global by score, my personal best, and my rank. Filterable by class. Each row shows username, class, level reached, score, date.

### Be honest with me about cheating

A browser game that posts its own score can be trivially faked with devtools. I accept this for now, but implement the cheap mitigations and tell me what they do and don't cover:

- Insert runs only through a Supabase **edge function**, not directly from the client
- Reject runs that are internally impossible: score not matching the formula given the other fields, duration under a plausible floor for the level reached, level above the XP curve maximum for that duration, zones cleared exceeding 5
- Rate-limit submissions per user
- Keep a `flagged` boolean rather than silently dropping suspicious runs, so I can look at them

Do not build anti-cheat beyond this. It is not worth the time for a game with a handful of players.

---

## 7. Arabic and RTL

This is a first-class requirement, not a translation pass at the end.

- `<html lang="ar" dir="rtl">`. Every menu, sheet, button, tooltip and number label in Arabic.
- **All strings live in `/src/i18n/ar.ts`.** No hardcoded text anywhere in components. Keep `en.ts` in parity for debugging.
- Use a font with proper Arabic glyph shaping. **Silkscreen and most pixel fonts have no Arabic coverage** — do not just apply the existing font and hope. Use `Cairo`, `Tajawal`, or `Noto Kufi Arabic` for Arabic text, and keep the pixel font only for Latin numerals and the logo if you want that look. Test that letters connect correctly.
- The **canvas game world does not flip.** The joystick stays on the right and abilities on the left — that is an ergonomic choice for right-handed thumbs, not a reading-direction one. Only the HTML UI mirrors.
- Watch these RTL failure points specifically: progress bars filling the wrong way, the health/mana bars, the cooldown overlay on ability buttons, the equipped-slot ordering, number formatting, and any `margin-left` that should be `margin-inline-start`. Use logical CSS properties throughout.
- Damage numbers on canvas stay LTR-rendered Western digits. Do not use Arabic-Indic digits in combat text — it hurts readability at speed. Use them in menus only if I ask.

Deliver a glossary table in the PR so I can correct terminology. Starting point:

| English | العربية |
|---|---|
| Emberfall | سقوط الجمر |
| New run | جولة جديدة |
| Log in / Sign up | تسجيل الدخول / إنشاء حساب |
| Username / Password | اسم المستخدم / كلمة المرور |
| Leaderboard | لوحة المتصدرين |
| Score | النتيجة |
| Best run | أفضل جولة |
| Level | المستوى |
| Life / Mana | الصحة / المانا |
| Damage / Armour / Resistance | الضرر / الدرع / المقاومة |
| Crit chance | فرصة الضربة الحاسمة |
| Move speed / Attack speed | سرعة الحركة / سرعة الهجوم |
| Bag / Stash | الحقيبة / المخزن |
| Workbench | طاولة الصناعة |
| Abilities | القدرات |
| Upgrade / Tier | ترقية / المرتبة |
| Equip / Salvage | تجهيز / تفكيك |
| Reroll / Lock / Enhance | إعادة التوزيع / تثبيت / تقوية |
| Materials / Shard / Gold | المواد / شظية / الذهب |
| Potion | جرعة |
| Zone / Boss | المنطقة / الزعيم |
| Bounty | مهمة |
| Kills | عدد القتلى |
| You fell | لقد سقطت |

---

## 8. Mobile and PWA

- Portrait only. Lock orientation where the browser allows it.
- Installable PWA: manifest, icons, service worker caching the assets so it loads offline up to the login screen.
- `100dvh` not `100vh`, and `env(safe-area-inset-*)` padding. The prototype already does this — keep it.
- Every interactive control must respond on `touchstart`, not wait for `click`. The prototype learned this the hard way; read how it handles `fastFire` and the dedupe guard before touching input code.
- **Never rebuild interactive DOM inside the render loop.** The prototype originally rebuilt the ability bar every frame, which made the buttons untappable on iOS and destroyed the frame rate. Build once, mutate properties.
- Target 60fps on an iPhone with 90 mobs in a zone. The prototype achieves this by baking the tilemap to one offscreen canvas, culling AI beyond 17 tiles, culling off-screen draws, and throttling HUD text to ~7Hz. Preserve all four.

---

## 9. Assets and licensing

Three packs are embedded in the prototype as base64. Extract them to files and record their licences in `/assets/CREDITS.md`:

- **Kenney Tiny Dungeon** and **Kenney Pixel UI Pack** — CC0, no restrictions, no attribution required (credit them anyway).
- **CraftPix free base character** and **CraftPix free undead tileset** — usable in the game including commercially, but **redistribution of the asset files is prohibited**. Base64 in a source file is effectively redistribution. Serve them as compiled/packed binary assets, and check the current CraftPix licence text for required attribution before deploy. Flag this to me in the PR.

The player character is an unclothed base sprite meant for layering. Note in the README that a clothing layer is outstanding art work.

Regular monsters are still Kenney tiles and visually clash with the CraftPix hero and ground. Leave them for now; I will source matching art.

---

## 10. Acceptance criteria

I will test these on an iPhone before merging:

1. Open the URL cold → Arabic login screen, RTL, correctly shaped Arabic text
2. Register a new username → land in the main menu, scoreboard visible
3. Menu shows my best score and global top 20
4. Start a run → name and class carry through, HUD in Arabic
5. Joystick: full speed at any drag distance in any direction, no slowdown at the edges
6. Every ability button, potion, interact prompt and nav tab responds on first tap
7. Kill a pack, loot an item, equip it from the bag, salvage a common, enhance to +3
8. Take a bounty, clear a zone, kill the boss, return through the portal
9. Deposit an item in the stash → die → new run → item still in the stash
10. Death summary in Arabic with correct numbers → score appears on the leaderboard
11. Log out, log back in on a different browser → same stash, same best score
12. Sustained 60fps in a full zone; no frame drops when 20+ mobs are on screen
13. Share the URL to someone else → they can register and appear on the same board

---

## 11. Non-goals

Do not build: multiplayer, chat, friends lists, trading, payments, ads, achievements, daily rewards, cloud save conflict UI beyond the simple prompt described, admin dashboard, or analytics beyond what Supabase gives for free.

---

## 12. How I want you to work

- Start by reading `emberfall-v9.html` end to end and giving me a short port plan and any disagreements with this brief. Wait for my go-ahead before writing code.
- Then work in stages, each independently runnable: **(1)** project scaffold + assets extracted + game ported and playable with no auth, **(2)** Supabase auth + profiles, **(3)** stash and run persistence, **(4)** leaderboard + edge function validation, **(5)** full Arabic/RTL pass, **(6)** PWA + deploy.
- Commit at the end of each stage with a clear message. Do not refactor across stage boundaries without telling me.
- Run `npm run build` and fix every type error before telling me a stage is done. No `any` to make errors go away.
- When you hit a decision I have not covered, ask rather than guess — especially anything touching auth, RLS, or the damage formulas.
- Tell me plainly when something in this brief is a bad idea.
