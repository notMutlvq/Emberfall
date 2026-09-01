# Emberfall (سقوط الجمر)

Portrait mobile roguelike ARPG. Ported from the single-file prototype
`emberfall-v9.html` (kept in the repo as the gameplay reference — see that
file and `emberfall-claude-code-prompt.md` for the full spec).

## Status: shipped (all 6 build stages) + iterating

The six build stages are done — scaffold + ported game, Supabase auth,
run/stash persistence, leaderboard + edge-function validation, full
Arabic/RTL, PWA + deploy. Live at
**https://notmutlvq.github.io/Emberfall/** (GitHub Pages via
`.github/workflows/deploy.yml`). Installable PWA — manifest, maskable
icons, a Workbox service worker precaching the app shell for offline load
up to the login screen.

**Post-ship iteration** (ongoing):
- Speed rebalance (player was ~2.7x mob speed; now ~1.5x), a small ability
  nerf/buff pass, random base-item names.
- The interact button (gate / stash / anvil / chest / NPC) was dead on
  touch since the port — fixed. Dungeons now have a "return to camp" gate.
- Bottom nav trimmed to Explore / Bag / Skills / Settings — Atlas and the
  Workbench are reached from the camp gate and anvil.
- Settings menu: sound volume/mute, `ar`/`en` language, end-run, log out,
  wipe saved data. Loading screen. Sound scaffold (`src/game/audio.ts` +
  `public/sfx/` — silent until files are added).

Art rebrand from the paid `Asset_1/` CraftPix packs (in progress): real
per-item icons, an animated Swordsman hero that gears up by level,
graveyard map props + a calmer floor, sprite-animation combat effects, and
CraftPix monster sprites. `scripts/pack-*.mjs` build the committed atlases
from `Asset_1/` (gitignored). The HTML **UI kit is deliberately not
reskinned** — the current dark-slate UI is clean and fully Arabic, and the
CraftPix kit's bitmap font is Latin-only.

### Base path

`vite.config.ts` sets `base: "/Emberfall/"` for the GitHub Pages project
site, so **`npm run dev` serves at `http://localhost:5173/Emberfall/`** (not
`/`). If this ever moves to a domain root, set `base` back to `"/"`.

Persistence recap: an in-progress run is mirrored to `localStorage`
(survives a reload / phone lock / dropped connection — "Resume run" on the
main menu); stash + best score + run count live in `player_state`, synced
to Supabase when signed in and cached in `localStorage` offline.

## Run it

```
npm install
copy .env.example .env   # then fill in your Supabase URL + anon key
npm run dev              # dev server
npm run build            # typecheck + production build to dist/
```

Without `.env` the game runs **offline**: no login screen, no leaderboard,
nothing persists — handy for working on gameplay.

## Strings / i18n

The game is Arabic-only. `src/i18n/ar.ts` holds every UI-chrome string
(mirrored key-for-key by `en.ts`, which is the type source + debug
reference); reach them with `t(key, vars)`. Game *content* names (classes,
abilities and their upgrade nodes, zones, item bases, rarities, affixes)
are Arabic directly in the data tables — `src/game/core.ts`, `classes.ts`,
`abilities.ts`, `zones.ts` — because they are 1:1 with ids and read better
colocated. `GLOSSARY.md` is the full term list. Static HTML text uses
`data-i18n` / `data-i18n-ph` attributes filled by `applyStaticI18n()` at
boot.

## Supabase setup (stage 2+)

1. Create a project at supabase.com.
2. **Authentication → Providers → Email: turn OFF "Confirm email".**
   (There are no real emails; accounts are `<username>@players.emberfall.app`.)
3. SQL editor → run `supabase/schema.sql`, then `supabase/policies.sql`.
   (Run `schema.sql` on a clean project — the `runs` foreign key changed in
   stage 4; if you ran an earlier copy, `drop table public.runs;` first.)
4. Project Settings → API → copy the Project URL and `anon` public key
   into `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
5. **Deploy the run-submit edge function** (needs the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy submit-run
   ```
   No extra secrets to set — the function uses the platform-provided
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.

## Leaderboard — what the anti-cheat does and doesn't do

A browser game that computes its own score can always be faked with
devtools. The mitigations here are the cheap ones the brief asked for:

- **Runs are inserted only by the `submit-run` edge function** (service
  role). The `runs` table has no client insert policy, so you can't `POST`
  a score straight to the database.
- The function **hard-rejects internally impossible runs**: score not
  matching `level*100 + kills*6 + elites*25 + bosses*250 + zones*300`,
  zones or bosses > 5, deepest zone > 4, `zones ≠ bosses`, level > 60,
  negatives, non-integers, unknown class.
- It **flags** (stores `flagged = true`, still visible to you) runs that
  are suspicious but not provably fake: finished faster than
  `15s + 6s/level`, kill/gold counts far above plausible, deeper than
  cleared.
- **Rate limit**: one accepted run per user per 30 seconds.

What it does **not** stop: a cheater who edits the in-memory game state so
that a high-level run is fully self-consistent (real playtime, matching
kill counts, correct score). Catching that needs server-side simulation or
replay validation, which isn't worth it for a handful of players. Use the
`flagged` column and eyeball the outliers.

## Layout

```
/src
  /game     engine, state, classes, abilities, items, zones, combat, render, hud, quests
            save (run mirror + stash/meta persistence), audio (sound scaffold)
  /ui       screens, auth, mainmenu (menu + leaderboard), menu (class pick),
            settings, sheets (bag / skills / craft / atlas)
  /net      supabase client, username/password auth, player_state, leaderboard
  /i18n     ar.ts (shipped) + en.ts (type source / debug) + t() and applyStaticI18n()
  /assets   extracted PNGs + CREDITS.md (CraftPix terms verified 2026-09-01)
/public     PWA icons (192/512/maskable), apple-touch-icon, favicon.svg
            /sfx  drop-in sound effects (empty by default — see its README)
/supabase   schema.sql, policies.sql, functions/submit-run/ (edge function)
/.github/workflows/deploy.yml   build + publish dist/ to GitHub Pages
```

The Atlas and Workbench sheets (`sh-maps`, `sh-craft`) still exist and
still work — they're just off the bottom nav. `quests.interact()` opens
the Atlas from the camp gate and the Workbench from the anvil; a dungeon
gate at the entrance calls `toHub()`.

The service worker (`vite-plugin-pwa`, Workbox `generateSW`) precaches the
built JS/CSS/HTML/PNG/SVG and runtime-caches the Google Fonts files.
Supabase requests are never cached. `registerType: "autoUpdate"` — a new
deploy is picked up on the next launch.

`player_state` rows are created lazily on first save; RLS keeps them
owner-only. `runs` is public-read (it's the leaderboard) and written only
by the edge function.

`core.ts` holds the shared mutable game state (`S`, `P`, `W.Z`) and data
tables with no imports of its own, so the rest of the game modules can
depend on it without forming a hard cycle.

## Known gaps

- **Art**: ships on placeholder art (Kenney tiles + an unclothed CraftPix
  hero). The `Asset_1/` re-skin was dropped in stage 5 — no license, wrong
  genre. Any future art pass is its own effort.
- Regular monster tiles are Kenney tiles and visually clash with the
  CraftPix hero/ground.
- A few Arabic strings carry RTL/LTR marks (`‏`) to keep
  number+symbol runs (`+3.2/ث`, `-10%`) reading correctly next to Arabic
  text — expected, not a bug.
- Idle/offline farming from the prototype was intentionally cut — this is
  a run-based roguelike.
