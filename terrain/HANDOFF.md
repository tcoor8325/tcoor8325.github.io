# Terrain Handoff

## Project Summary
`Terrain` is a TypeScript + PixiJS prototype for a 2D town-builder web app in the portfolio.
Current loop:
- Paint terrain
- Place one settlement
- Run daily simulation ticks
- Inspect settlement state in a tabbed panel

## Tech and Build
- Language: TypeScript
- Rendering: PixiJS (CDN in `index.html`)
- Pattern: simple ECS-style stores (`World`, `ComponentStore`)
- Commands:
  - `npm install`
  - `npm run check`
  - `npm run build`

## Main Files
- `index.html`: controls and settlement info panel layout
- `styles.css`: UI styling
- `src/main.ts`: interaction flow, rendering, simulation, settlement inspection
- `src/components.ts`: component and settlement data model types
- `src/tribal-governor-names.ts`: random first/last name lists and governor name generator
- `src/ecs.ts`: ECS helpers
- `dist/*`: compiled JS output

## Gameplay and Simulation

### 1) Map edit phase
- 1000x1000 paint area
- Brush types: grass, water, tree
- Adjustable brush size
- Click-drag painting

### 2) Settlement phase
- First settlement must be placed on grass
- Settlement visual:
  - black center circle
  - hollow border circle
- Border radius is dynamic:
  - starts at `50`
  - scales upward with population relative to starting pop

### 3) Simulation phase
- `1 tick = 1 day`
- Base speed ~1 second per day (scaled by speed control)
- Per-day gathering rules:
  - fish gain = `hunters * nearby_water_tiles * 0.001 * random(0.9, 1.1)`
  - fruit gain = `gatherers * nearby_tree_tiles * 0.001 * random(0.9, 1.1)`
- Fish market system (fish-first, generalizable algorithm):
  - total sell orders `S = carryover_fish + fish_gain_today`
  - total buy orders `D = sum(all fish buy orders)`
  - raw price `P_raw = 10 * (D/S)^1`
  - price bounds: min `1`, max `100`
  - fulfillment ratio `R = min(1, S/D)`
  - distribution per buyer: `received = requested * R`
  - leftovers carry to market inventory for tomorrow
- Fish spoilage:
  - 33% of market fish carryover is lost every day
- Weekly population vital rates (every 7 days, per cohort):
  - deaths = `0.001 * cohort_population`
  - births = `0.005 * cohort_population`
- Food shortage still causes labor-population losses
- Strong surplus can still slowly grow gatherers
- Tribal governor rerolls every 25 years (`9,125` days)
- House placement/expansion logic is removed

## Settlement UI
Click settlement core or border to inspect.
Tabs:
- Government
- Population
- Natural Resources and Manufactured Resources
- Labor
- Buildings

Resources tab also includes Fish Market metrics:
- Daily price
- Sell orders
- Buy orders
- Fulfillment ratio
- Carryover inventory

## Data Model Snapshot
Settlement tracks:
- Government + governor + next election day
- Society type: `free market`
- Natural and manufactured resources
- Building levels:
  - `storehouse`
  - `test`
  - `fishingBuilding`
  - `smokingHut`
  - `smokingHutWoodRequirement`
- Market state (currently fish):
  - inventory
  - total sell orders
  - total buy orders
  - fulfillment ratio
  - raw price
  - bounded price
  - sold quantity
  - last order allocations
- Labor totals
- Population cohorts:
  - culture
  - religion
  - labor type
  - count

## Baseline Starting State
- Cohorts:
  - hunters: 99
  - gatherers: 99
  - rulers: 1
- Culture A: `Caananite`
- Religion A: `Animist`
- Buildings:
  - Storehouse: 1000
  - Test: 100
  - Fishing Building: 0
  - Smoking Hut: 0
  - Smoking Hut wood requirement: 1

## Current Notes
- Smoking Hut requirement line in AGENTS was previously truncated in an earlier revision; current code only enforces the explicit `1 wood` requirement already modeled.
- Market allocation is fractional (not integer-rounded by strict goods units).
- Radius terrain scans are brute force and can become expensive with many settlements.

## Suggested Next Steps
1. Finalize complete Smoking Hut behavior (beyond wood requirement).
2. Decide whether market allocations should be integer and deterministic.
3. Add save/load for terrain + settlement state.
4. Add spatial optimization for radius scans.
