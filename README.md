# Emberfall (سقوط الجمر)

Portrait mobile roguelike ARPG. Ported from the single-file prototype
`emberfall-v9.html` (kept in the repo as the gameplay reference — see that
file and `emberfall-claude-code-prompt.md` for the full spec).

## Status: stage 1 of 6

Game ported and playable, no auth yet, no persistence yet, UI still in
English pending the stage 5 Arabic/RTL pass. See
`emberfall-claude-code-prompt.md` §12 for the remaining stages.

## Run it

```
npm install
npm run dev       # dev server
npm run build     # typecheck + production build to dist/
```

## Layout

```
/src
  /game     engine, state, classes, abilities, items, zones, combat, render, hud, quests
  /ui       menu (class pick), sheets (bag/skills/craft/atlas)
  /i18n     en.ts / ar.ts string tables — not wired into the UI yet (stage 5)
  /assets   extracted PNGs + CREDITS.md (licensing — read before deploy)
```

`core.ts` holds the shared mutable game state (`S`, `P`, `W.Z`) and data
tables with no imports of its own, so the rest of the game modules can
depend on it without forming a hard cycle.

## Known gaps going into stage 1's acceptance

- The player sprite (`src/assets/hero.png`) is an unclothed base layer —
  a clothing layer is outstanding art work.
- Regular monster tiles are Kenney tiles and visually clash with the
  CraftPix hero/ground; matching monster art is still needed.
- Idle/offline farming from the prototype was intentionally cut — this is
  a run-based roguelike (see repo memory / stage 1 discussion).
