# Asset credits

Extracted from `emberfall-v9.html`'s inline base64 into real files here. Filenames
below are this repo's; original pack names are noted per source.

## Kenney — CC0

- `tilesheet.png` — Kenney **Tiny Dungeon** tileset, now only the monster tiles
  and NPC portraits. The chest / chest-open / stash / anvil / gate / stump cells
  are re-skinned from the CraftPix "All Tileset" camp pack by
  `scripts/pack-tileset-objects.mjs`; the floor/wall cells it carried (40, 48–51)
  are unused dead constants and the 125 rubble cell is re-skinned by
  `scripts/pack-env.mjs` — see below. The `ui-panel.png` / `ui-button.png` /
  `ui-button-active.png` 9-slices that used to come from Kenney's **Pixel UI
  Pack** are now packed from CraftPix's Ui pack instead (see below) — Kenney's
  UI pack is no longer used.

CC0 — public domain, no restrictions, attribution not required. Credited anyway:
[kenney.nl](https://kenney.nl).

## Audio — CC0

- `public/sfx/*.ogg` — Kenney **Impact Sounds** + **Interface Sounds** packs
  (CC0). Per-file mapping in `public/sfx/README.md`.
- `public/music/dungeon.ogg` — "Loopable Dungeon Ambience" by **JaggedStone**,
  OpenGameArt, CC0 — https://opengameart.org/content/loopable-dungeon-ambience
- `public/music/camp.mp3` — "Town Theme (RPG)" by **cynicmusic**
  (cynicmusic.com / pixelsphere.org), OpenGameArt, CC0 —
  https://opengameart.org/content/town-theme-rpg

All CC0: usable in commercial projects, no attribution required (credited
regardless). The SFX packs ship `.ogg`; kept as-is (all current browsers
decode Ogg Vorbis). Missing files degrade to silence in `src/game/audio.ts`.

## CraftPix — licensed, redistribution prohibited

- `boss.png` — CraftPix undead boss sprite (crowned lich).
- `hero1/2/3.png` — Swordsman lvl1-3, packed by `scripts/pack-hero.mjs`.
- `weapons.png`, `potions.png` — `scripts/pack-icons.mjs`.
- `mobs.png` — `scripts/pack-mobs.mjs` (8 monster icons).
- `props.png` — `scripts/pack-props.mjs` (22 graveyard decorations: headstones,
  bones, ruined arches, dead trees, clawing hands — from
  `Asset_1/Map/Objects_separately/`).
- `fx_fire/burst/ice.png` — `scripts/pack-fx.mjs` (10-frame effect strips).
- `fx_light.png` — `scripts/pack-fx.mjs`, the 4 `Lightning_spot` spark-burst
  frames from `Asset_1/Effect/Lightning/`. Used for lightning-element ability
  hits and each chain-lightning jump.
- `env.png` — `scripts/pack-env.mjs`: the dungeon ground strip (tan/grey
  cobblestone floors + detail, dark cave-rock walls) from
  `Asset_1/Map/Ground_rocks.png`. The same script re-skins the `tilesheet.png`
  cell 125 (wall-base rubble) to match. `src/game/zones.ts` `buildMap()` adds the
  drop-shadows, wall lip/face shading and per-zone colour wash in code.
- `ui-panel.png`, `ui-button.png`, `ui-button-active.png`, `ui-icons.png` —
  `scripts/pack-ui.mjs`: blank, text-free panel/button/icon pieces from the
  CraftPix **Ui** pack (`Asset_1/Ui/`), recolored from its stock green/tan
  parchment palette to this game's dark-slate + gold one (see the script's
  header comment for the recolor approach). Replaces the Kenney `ui-panel.png`
  / `ui-button.png` / `ui-button-active.png` 9-slices. The pack's own labeled
  buttons ("RESUME", "QUIT", …) and bitmap font are Latin-only and are not
  used — all UI text stays HTML/CSS in the Arabic font.

All the above are packed from **paid CraftPix packs** in `Asset_1/`, which is
gitignored — only the packed atlases are committed. Owner holds a CraftPix
licence. The remaining `tilesheet.png` cells (chest, stash, anvil, gate,
potion, monster tiles, NPC portraits) are still Kenney (CC0).

**Verified against craftpix.net/file-licenses on 2026-09-01** (stage 6, pre-deploy):

- Use in personal **and commercial** projects: permitted, any number.
- **Attribution: not required** ("any credit will be highly appreciated").
  Credited here regardless.
- **Reselling or redistributing the raw source files (PNG/JPG/EPS/AI) — or a
  slightly modified version — is prohibited**, as is redistribution that makes
  the files usable to other end-users through an app. **Embedding assets in a
  game is explicitly allowed.**
- Use of the assets to train / fine-tune AI or ML systems is prohibited.

Emberfall serves `hero.png` / `boss.png` as compiled, packed image files
rendered inside a playable game — the allowed use. They are not offered for
download, repackaged, or resold. (As with any web game, a determined user can
still save a rendered PNG; that is not redistribution in the license's sense.)
No attribution string is required in-product.

## Outstanding art work

- All three classes render the CraftPix Swordsman sprite (tinted per class) — a
  mage holding a sword reads oddly; per-class weapon art is not made.
- Monsters use one static icon per kind (`mobs.png`); no per-kind variety or
  attack frames. The `Monestar/` icon set can't cleanly supply thematic
  undead pairs, so this stays as-is.
- The `tilesheet.png` NPC portraits (quartermaster, scholar) are still Kenney.
