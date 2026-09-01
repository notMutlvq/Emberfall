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

- `boss.png` — CraftPix undead boss sprite (crowned lich).
- `hero1/2/3.png` — Swordsman lvl1-3, packed by `scripts/pack-hero.mjs`.
- `weapons.png`, `potions.png` — `scripts/pack-icons.mjs`.
- `mobs.png` — `scripts/pack-mobs.mjs` (8 monster icons).
- `props.png` — `scripts/pack-props.mjs` (14 graveyard decorations).
- `fx_fire/burst/ice.png` — `scripts/pack-fx.mjs` (10-frame effect strips).

All the above are packed from **paid CraftPix packs** in `Asset_1/`, which is
gitignored — only the packed atlases are committed. Owner holds a CraftPix
licence. `tilesheet.png` / `env.png` / the `ui-*` 9-slices are still Kenney
(CC0). The HTML UI has not been reskinned.

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
