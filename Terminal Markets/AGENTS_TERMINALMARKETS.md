# AGENTS

If this is your first command read the README.md and HANDOFF.md before executing the 
commands here

Stop and ask me if you have any questions about the instructions before or during execution.

Please confirm that the Terminal Markets webapp uses API calls using the provided api key through python streamlit to MyMarketNews API

## API_HOWTO Notes
- Auth uses your MyMarketNews API key via HTTPS Basic auth (key as username, blank password).
- Report data is pulled from `/services/v1.2/reports/<slug_id>` and can be filtered with `q=...;commodity=...`.
- The API also exposes `/services/v1.2/commodities` for the full commodity list.

## Foods In API_HOWTO Not Yet Added As Webpage Buttons
Current webpage food buttons: apples, bananas, oranges, tomatoes, lettuce, onions, potatoes, almonds.

Additional API_HOWTO commodity examples not currently added as buttons:
- butter
- cheese
- corn
- soybeans
