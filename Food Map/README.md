# Food Map

A subpage of the digital portfolio that lists foods, where they are grown/harvested, and shows an interactive world map highlighting each food's range.

## Goals
- Maintain a clear list of foods with brief growth/harvest summaries and sources.
- Provide an interactive map that highlights a food's geographic range when selected.
- Keep the map data easy to edit and scalable for LLM-driven updates.

## Planned Structure
- `Food Map/food-map.html` (or similar) page for the Food Map experience.
- `Food Map/food-map.js` renders the list and map from JSON data.
- `Food Map/FOODS.md` stores food entries and their metadata.
- `Food Map/sources/` (or a single `Food Map/SOURCES.md`) stores references used for the food entries.
- `Food Map/tiles/` stores XYZ tiles rendered from SPAM GeoTIFF inputs.
- `Food Map/scripts/build_spam_tiles.py` generates COGs and tiles.

## Food Entry Format (proposed)
Each food entry in `FOODS.md` should include:
- Name
- Regions (text summary)
- Harvest season(s)
- Source references (IDs or links stored in `SOURCES.md`)
- Optional map key for future overlays

## Map Data
- Current map uses MapLibre quickstart demo tiles to verify rendering.
- SPAM 2020 tiles and scripts remain in `Food Map/tiles/` and `Food Map/scripts/` for later wiring.

## Local Development
- Open `index.html` and the Food Map page directly in a browser, or run the existing `start_portfolio.sh`.

## Next Steps
- Draft `FOODS.md` with initial foods and citations.
- Expand `SOURCES.md` with verified references.
- Add more SPAM layers and connect them to foods.
