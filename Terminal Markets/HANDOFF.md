# HANDOFF

Date: February 15, 2026

## Scope
This session focused on `Terminal Markets/food_clock.py` (data collection, CSV format, and plotting), not UI work.

## Summary of What Changed
1. Refactored `food_clock.py` from large date-range pulls to single-day query iteration.
2. Added immediate CSV initialization and incremental CSV rewrites during collection.
3. Added multi-food support in one run (default list expanded).
4. Changed CSV format to grouped sections per food using separator rows:
   - `### FOOD: <name> ###`
5. Added polar plotting from CSV with low-pass smoothing.
6. Updated plotting to generate separate figure files per food.
7. Rotated plot so January is at top and dates run clockwise.
8. Adjusted plot layout sizing and legend size.
9. Changed commodity matching to strict exact match on `row["commodity"]` (case-insensitive).
10. Added non-report-day fill rule:
   - If a day has no report, write the average availability from the last 3 available report days.
11. Updated plot parser to read fractional CSV values (`0..1`) from imputed days.
12. Made default file paths script-local so running from repo root or `Terminal Markets/` both work.

## File Updated
- `Terminal Markets/food_clock.py`
- `Terminal Markets/HANDOFF.md` (this file)

## Current CSV Behavior
- Header remains: `origin,0,1,2,...`
- Days are offsets from today:
  - `0` = today, `1` = yesterday, etc.
- Data rows are grouped by food section.
- Values are now numeric signals:
  - `1` or `0` on available report days.
  - Fractional values (for example `0.3333`, `0.6667`) on non-report days via 3-day backward averaging over available report days.

## Current Matching Logic (Important)
Commodity matching is now exact on the API commodity field:
- Uses only `row["commodity"]`.
- Case-insensitive, whitespace-normalized exact compare.
- No token subset matching.
- No fallback full-row text scanning.

Implication:
- Inputs must match the report commodity label exactly (for example `Tomatoes` matches `Tomatoes`, but `Tomato` will not).

## Current Plot Behavior
- One polar image per food section with data.
- If multiple foods are present, output filenames are auto-suffixed:
  - Example: `food_clock_polar_tomatoes.png`, `food_clock_polar_garlic.png`
- Geometry:
  - January at top.
  - Clockwise date direction.
- Plot reads numeric signals (`0..1`), then applies low-pass smoothing.

## CLI Notes
- `--commodity` accepts comma-separated values by default.
- To preserve names that include commas, use semicolon separators:
  - Example: `--commodity 'Corn, Sweet;Onions, Dry;Peppers, Bell Type'`
- Useful flags:
  - `--plot-only`
  - `--no-plot`
  - `--plot-output`
  - `--smooth-window-days`
  - `--smooth-passes`
  - `--no-show`

## Current Default Commodity List
`food_clock.py` defaults to:
- `Sweet Corn`
- `Onions`
- `Garlic`
- `Banana`
- `Tomatoes`
- `Lemon`
- `Peppers, Bell Type`
- `Mushrooms`
- `Carrots`
- `Sweet Potatoes`
- `Cabbage`
- `Cauliflower`
- `Cucumbers`
- `Broccoli`
- `Spinach`
- `Eggplant`

Note:
- Because matching is exact, some defaults may return zero rows in Chicago terminal vegetables unless the label matches exactly in that report's commodity field.

## Validation Performed
- Compile check: `python3 -m py_compile 'Terminal Markets/food_clock.py'` passed.
- Data generation tested with multiple `--days-back` windows and `--no-plot`.
- Multi-food CSV with section separators verified.
- Imputed non-report-day fractional values verified in CSV output.
- Plot-only tested on both binary and fractional CSVs.
- Multi-food plotting confirmed one output file per food with data.
