# Food Map Handoff

## Current status
- Food Map page is a MapLibre globe with a production-only crop layer selector.
- Crop list uses full names and is displayed one crop per row.
- Only one layer can be active at a time.
- Map shows SPAM 2020 production tiles (local XYZ tiles).

## Key files
- `Food Map/food-map.html`: single-page implementation (HTML, CSS, JS in one file).
- `Food Map/tiles/`: XYZ tiles generated for all crops (production only in use).
- `Food Map/Data/processed/`: COGs generated per crop/dataset.
- `Food Map/scripts/build_spam_tiles.py`: tile/COG generator.

## Data layout
- Production tiles path pattern:
  - `Food Map/tiles/spam2020_global_production_<crop>/{z}/{x}/{y}.png`
  - `<crop>` is the lowercase crop code (e.g., `rice`, `sorg`).
- Source TIFFs live under:
  - `Food Map/Data/spam2020V2r0_global_production.geotiff/spam2020V2r0_global_production/`

## How the map works
- Uses MapLibre globe demo style (`https://demotiles.maplibre.org/globe.json`).
- Country fills forced white; borders forced black.
- Globe background behind the map container is black, oceans stay blue.
- On load, the map selects Rice → Production by default.

## Notes
- Full crop names were guessed from SPAM crop codes. Update as needed.
- Only production is exposed in the UI; other datasets remain on disk but unused.

## TODO / Next steps
1. Replace guessed crop names with authoritative names.
2. Add a legend/color scale for production intensity.
3. Optional: remove unused non-production tiles to save disk space.
