# Emberfall (سقوط الجمر)

Portrait mobile roguelike ARPG. Ported from the single-file prototype
`emberfall-v9.html` (kept in the repo as the gameplay reference — see that
file and `emberfall-claude-code-prompt.md` for the full spec).

## Status: stage 2 of 6

Auth (Supabase, username + password) and the `profiles` table are in.
Persistence (stage 3), leaderboard (stage 4), Arabic/RTL + art re-skin
(stage 5), PWA/deploy (stage 6) still to come. See
`emberfall-claude-code-prompt.md` §12.

## Run it

```
npm install
copy .env.example .env   # then fill in your Supabase URL + anon key
npm run dev              # dev server
npm run build            # typecheck + production build to dist/
```

Without `.env` the game runs **offline**: no login screen, no leaderboard,
nothing persists — handy for working on gameplay.

## Supabase setup (stage 2+)

1. Create a project at supabase.com.
2. **Authentication → Providers → Email: turn OFF "Confirm email".**
   (There are no real emails; accounts are `<username>@players.emberfall.app`.)
3. SQL editor → run `supabase/schema.sql`, then `supabase/policies.sql`.
4. Project Settings → API → copy the Project URL and `anon` public key
   into `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Layout

```
/src
  /game     engine, state, classes, abilities, items, zones, combat, render, hud, quests
  /ui       screens, auth, mainmenu, menu (class pick), sheets (bag/skills/craft/atlas)
  /net      supabase client + username/password auth
  /i18n     en.ts / ar.ts string tables — not wired into the UI yet (stage 5)
  /assets   extracted PNGs + CREDITS.md (licensing — read before deploy)
/supabase   schema.sql + policies.sql
```

`core.ts` holds the shared mutable game state (`S`, `P`, `W.Z`) and data
tables with no imports of its own, so the rest of the game modules can
depend on it without forming a hard cycle.

## Known gaps

- The player sprite (`src/assets/hero.png`) is an unclothed base layer —
  a clothing layer is outstanding art work. A full art re-skin (from the
  `Asset_1/` pack) is planned for stage 5 alongside the Arabic/RTL pass.
- Regular monster tiles are Kenney tiles and visually clash with the
  CraftPix hero/ground; matching monster art is still needed.
- Idle/offline farming from the prototype was intentionally cut — this is
  a run-based roguelike.
