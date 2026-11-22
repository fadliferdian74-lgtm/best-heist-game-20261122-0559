# The Gilded Hour

[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/fadliferdian74-lgtm/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/fadliferdian74-lgtm/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

**The Gilded Hour** is an original top-down stealth heist game for the desktop
browser. One night, one grand hotel-casino — the Meridian Grand — and one
thief: you.

Plan the job on the blueprint screen: pick one of three ways in (the front
doors, the service alley vent, or the gallery skylight), and spend a six-point
gear budget on tools that each cost you something — a lockpick kit, EMP
charges that blind the cameras, smoke pellets, a glass cutter, decoy coins and
padded soles.

Then work the floor. Guards patrol with sweeping vision cones, cameras pan
across the gallery and the casino, and every second you are seen feeds the
alarm meter. Loot the paintings, the gem cases and the cash cages, crack the
office safe with the keycard from the security desk, drill the vault if you
dare — drilling is loud, and loud brings company. Every kilo you carry slows
you down. Get back to the van in the service alley before the night ends, or
get caught trying.

## Play

```sh
node serve.ts        # then open http://localhost:8080
```

- **WASD / arrow keys** — move
- **Shift** — sneak (slow, quiet, harder to spot)
- **E** — interact: take loot, pick a lock, drill, cut glass, grab the keycard
- **Q** — throw a decoy coin · **F** — EMP charge · **Space** — smoke pellet
- **M** — mute · **R** — restart the night

## Layout

- `game/` — the game itself: plain static files, no build step, no network.
  Its source is split by job under `game/src/` (`world.js` walks the floor and
  traces sight lines, `guards.js` runs the patrol AI, `cameras.js` the camera
  net, `alarm.js` the heat, `loot.js` the take, `render.js` every drawing).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes the dossier with `vendor/makefun-game.ts`.
- `screenshots/` — real renders of the game running, taken by its maker.
