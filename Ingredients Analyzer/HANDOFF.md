# Ingredients Analyzer Handoff

## Current status
- Single-page UI renders ingredient categories horizontally with per-category search bars.
- Clicking a food pins it to the top of its category and re-sorts all categories by cosine similarity.
- Similarity score is shown and rendered as a health-bar fill (red <= 0.25, yellow 0.25–0.6, green > 0.6).
- UI fetches `embeddings.json` with `cache: "no-store"` to avoid stale data.

## Key files
- `index.html`: main UI + client-side sorting/selection logic.
- `styles.css`: layout and health-bar styling.
- `FOODS.md`: canonical ingredient list (current format includes a fenced ```markdown block).
- `scripts/generate_embeddings.py`: parses FOODS.md and creates `embeddings.json`.
- `embeddings.json`: generated vectors used by the UI.

## Data / parsing notes
- FOODS.md now uses entries like:
  - `- **Name**:`
  - `- Tags:`
  - `- Often with:`
  - `- Often in:`
- The generator:
  - Extracts the fenced markdown block if present.
  - Builds the description from Often-with + Often-in.
  - Embedding input ignores tags and strips the literal phrases `Often with:` / `Often in:`.

## Latest content changes
- Onion split into Red / Yellow / Spanish / Sweet.
- Pasta consolidated to `Pasta`; removed separate spaghetti/penne entries.
- `Egg` removed (kept `Eggs`).
- Added requested items: Chocolate, Anchovies, Sardines, Crab, Lobster, Yeast, Yeast Extract, Red Wine, White Wine, Beer, Raisins, Sesame oil, Walnuts, Almonds, Cashews, Ice, Orange Zest, Lemon Zest, Liquid Smoke, Seaweed, Samphire, Malt, Fish Sauce, Clams.
- Spaghetti squash no longer tagged as Carbohydrate.

## How to regenerate embeddings
Run:
`python3 scripts/generate_embeddings.py`

## Next steps / TODO
- Decide whether cooking methods should live in FOODS.md (currently removed).
- Review tags for accuracy (some items are tagged broadly, e.g., many dairy entries as Fat-only).
- Optional: add a legend UI for the score colors or a clear-selection control.
