## Terrain

`Terrain` is a browser-based 2D town-builder prototype in the portfolio, built with TypeScript and PixiJS.

## Run locally

1. Install dependencies: `npm install`
2. Type-check: `npm run check`
3. Build: `npm run build`
4. Open from portfolio homepage: `../index.html` -> `Terrain`

## Gameplay

1. Map edit phase
- Paint a `1000x1000` map.
- Brush tools: `Grass`, `Water`, `Trees`.
- Brush size is configurable.

2. Settlement phase
- Click `Finalize Map`.
- Place one settlement on a grass tile.
- Settlement visual:
  - black center circle
  - hollow border circle
- Border radius starts at `50px` and grows with population.

3. Simulation phase
- Click `Begin Simulation`.
- Time model: `1 tick = 1 day`, base tick interval `~1 second`.
- Daily resource rules:
  - fish gain = `hunters * water_tiles_in_border * 0.001 * random(0.9, 1.1)`
  - fruits gain = `gatherers * tree_tiles_in_border * 0.001 * random(0.9, 1.1)`
- Fish market (free-market model, fish-first implementation):
  - sell orders = `yesterday_unsold_fish + fish_gained_today`
  - buy orders = population fish demand (1 fish per pop/day)
  - price = `clamp(1, 100, 10 * (D / S)^1)`
  - fulfillment ratio = `min(1, S / D)`
  - leftover fish carries to next day as market inventory with daily spoilage (`33%` loss)
- Weekly population vital rates (applied per cohort every 7 days):
  - natural deaths = `0.001 * cohort_population`
  - natural births = `0.005 * cohort_population`
- Tribal governor rotates every 25 years (`9,125` ticks).
- Houses are removed from current gameplay.

## Settlement detail UI

Clicking a settlement opens five tabs:
- Government
- Population
- Natural Resources and Manufactured Resources
- Labor
- Buildings

## Current population model

Population is tracked as per-settlement cohorts, each with:
- culture
- religion
- labor type
- count

Current baseline values are:
- Culture A = `Caananite`
- Religion A = `Animist`

## Buildings

Building development levels are tracked per settlement:
- `Storehouse`: starts at `1000` (total pooled storage capacity)
- `Test`: starts at `100` (100 tents)
- `Fishing Building`: starts at `0`
- `Smoking Hut`: starts at `0` (tracked with a `1 wood` requirement placeholder)

## Controls

- `Finalize Map`
- `Begin Simulation`
- `Simulation Speed` (`1x`, `5x`, `20x`, `60x`)
- `Reset`

## Note

`AGENTS_Terrain.md` currently has a truncated requirement line:
- `Smoking Hut (Level 0) Requires 1 wood and ...`

Current implementation tracks the explicit part (`1 wood`) and leaves the unfinished clause as a placeholder.
