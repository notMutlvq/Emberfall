# Emberfall (سقوط الجمر)

Portrait mobile roguelike ARPG. Ported from the single-file prototype
`emberfall-v9.html` (kept in the repo as the gameplay reference — see that
file and `emberfall-claude-code-prompt.md` for the full spec).

## Status: stage 4 of 6

Auth + `profiles`, run/stash persistence, and now the **leaderboard**: the
main menu shows the global top 20 (filterable by class), your best score
and your rank. Finished runs are posted through the `submit-run` edge
function — the `runs` table has no client insert path. Arabic/RTL + art
re-skin (stage 5) and PWA/deploy (stage 6) remain. See
`emberfall-claude-code-prompt.md` §12.

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
            save (run mirror + stash/meta persistence)
  /ui       screens, auth, mainmenu (menu + leaderboard), menu (class pick),
            sheets (bag/skills/craft/atlas)
  /net      supabase client, username/password auth, player_state, leaderboard
  /i18n     en.ts / ar.ts string tables — not wired into the UI yet (stage 5)
  /assets   extracted PNGs + CREDITS.md (licensing — read before deploy)
/supabase   schema.sql, policies.sql, functions/submit-run/ (edge function)
```

`player_state` rows are created lazily on first save; RLS keeps them
owner-only. `runs` is public-read (it's the leaderboard) and written only
by the edge function.

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
