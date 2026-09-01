# Asset credits

Extracted from `emberfall-v9.html`'s inline base64 into real files here. Filenames
below are this repo's; original pack names are noted per source.

## Kenney — CC0

- `tilesheet.png` — Kenney **Tiny Dungeon** tileset (floors, walls, props, chest,
  stash, anvil, gate, potion, monster tiles, NPC portraits).
- `env.png`, `props.png` — companion environment/prop strips from the same pack.
- `ui-panel.png`, `ui-button.png`, `ui-button-active.png` — Kenney **Pixel UI Pack**
  9-slice panel/button borders.

CC0 — public domain, no restrictions, attribution not required. Credited anyway:
[kenney.nl](https://kenney.nl).

## CraftPix — licensed, redistribution prohibited

- `hero.png` — CraftPix free base character sprite atlas (being replaced by the
  paid "Swordsman" pack, see below).
- `boss.png` — CraftPix free undead tileset, boss sprite.
- `weapons.png`, `potions.png` — atlases packed by `scripts/pack-icons.mjs`
  from **paid CraftPix icon packs** (`Asset_1/Weapon`, `Asset_1/Potion`). The
  source `Asset_1/` tree is gitignored; only the packed atlases are committed.

The art re-skin from the paid `Asset_1/` CraftPix packs (Swordsman lvl1-3,
UI kit, weapon/potion/monster icons, effect strips, map tilesets) is in
progress. Owner holds a CraftPix licence for these.

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

- The player character (`hero.png`) is an unclothed base sprite meant for
  layering — a clothing layer is not yet made.
- Regular monster tiles are still Kenney `tilesheet.png` tiles and visually
  clash with the CraftPix hero/ground; matching monster art is still needed.
