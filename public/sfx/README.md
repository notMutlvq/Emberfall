# Sound effects

Short one-shot `.ogg` files. `src/game/audio.ts` looks them up by name; a
missing file is a silent no-op, so the game runs fine with this folder empty.

| file | when | source (Kenney, CC0) |
|---|---|---|
| `step.ogg` | player footfall (rate-limited ~3/s while moving) | Impact Sounds `footstep_concrete_000` |
| `hit.ogg` | player takes a hit | Impact Sounds `impactPunch_medium_000` |
| `mob_die.ogg` | a normal/elite enemy dies | Impact Sounds `impactMining_001` |
| `boss.ogg` | boss awakens | Interface Sounds `bong_001` |
| `drop.ogg` | loot hits the ground | Impact Sounds `impactMetal_light_000` |
| `pickup.ogg` | item picked up into the bag | Interface Sounds `pluck_002` |
| `levelup.ogg` | level up | Interface Sounds `confirmation_002` |
| `potion.ogg` | potion drunk | Impact Sounds `impactSoft_medium_000` |
| `ui.ogg` | menu / button tap | Interface Sounds `click_003` |
| `ability.ogg` | an ability is cast | Impact Sounds `impactGeneric_light_002` |

Music beds live in `../music/` (`camp.mp3`, `dungeon.ogg`). Volume, music
volume and mute are in the in-game Settings menu (persisted to localStorage).
See `../../src/assets/CREDITS.md` for full licensing.
