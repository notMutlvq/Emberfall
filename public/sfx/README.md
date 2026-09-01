# Sound effects

Drop short one-shot `.mp3` files here. `src/game/audio.ts` looks them up by
name; a missing file is a silent no-op, so the game runs fine with this
folder empty.

Names the game already calls:

| file | when |
|---|---|
| `step.mp3` | player footfall (rate-limited ~3/s while moving) |
| `hit.mp3` | player takes a hit |
| `mob_die.mp3` | a normal/elite enemy dies |
| `boss.mp3` | boss awakens |
| `drop.mp3` | loot hits the ground |
| `pickup.mp3` | item picked up into the bag |
| `levelup.mp3` | level up |
| `potion.mp3` | potion drunk |

Volume + mute are in the in-game Settings menu (persisted to localStorage).
