# Terminal Markets

Terminal Markets is a USDA AMS market report viewer inside the portfolio.

## What It Does
- Lets users pick a city, date, and food term from the Terminal Markets tab.
- Calls a local Python proxy at `http://localhost:8070`.
- The proxy calls authenticated MyMarketNews/MARS API endpoints (`/services/v1.2`) using your API key.
- Returns structured fields (`origins`, `package`, `itemSize`, `marketPrices`, `offerings`, `quality`) to the UI.

## Architecture
- Frontend: `Terminal Markets/index.html`, `Terminal Markets/app.js`
- Proxy API: `Terminal Markets/proxy_server.py`
- Dev Auth Tool: `Terminal Markets/streamlit_mars_dev.py`

## Requirements
- Python 3.10+
- Node/npm (for the Tech Tree server launched by `start_portfolio.sh`)
- Python deps:
  - `requests`
  - `streamlit` (Streamlit dev mode only)

## Environment
Set your MyMarketNews API key before starting:

```bash
export MARS_API_KEY='<your_key>'
```

Persistent setup (so you do not re-export each time):
- `start_portfolio.sh` auto-loads these files if present:
  - `~/.config/terminal-markets.env`
  - `./.env.local`
  - `./Terminal Markets/.env.local`
- File format example:

```bash
MARS_API_KEY='your_key'
```

Later files override earlier ones if multiple are present.

Optional env vars:
- `TERMINAL_MARKETS_MARS_API_KEY` (alternate key variable)
- `TERMINAL_MARKETS_PORT` (proxy port, default `8070`)
- `TERMINAL_MARKETS_MAX_CLOSEST_DATE_DAYS` (closest-date search window, default `45`)

## Run Portfolio + Proxy
1. From repo root: `./start_portfolio.sh`
2. Open: `http://localhost:8000`
3. Go to the `Terminal Markets` tab

## Run Streamlit Dev Mode
1. Install deps: `python -m pip install streamlit requests`
2. Set key: `export MARS_API_KEY='<your_key>'` (or use Streamlit secrets)
3. Run: `streamlit run 'Terminal Markets/streamlit_mars_dev.py'`

## API Behavior (Current)
- Uses HTTPS + Basic auth with API key username and blank password.
- Loads terminal report catalog from `/services/v1.2/reports`.
- Fetches report data from `/reports/<slug_id>?q=...` and extracts rows directly from the response.
- Uses API-side filtering with `q` clauses:
  - `report_begin_date=mm/dd/yyyy;commodity=...`
  - `report_end_date=mm/dd/yyyy;commodity=...`
- Applies nearest-date widening when an exact date has no match.
- Surfaces upstream API errors clearly (`401`, `429`, etc.).
- Proxy logs requests and API errors to stdout for debugging.

## Troubleshooting
- `MARS API error (503): Missing API key`
  - Export `MARS_API_KEY` before starting.
- `401` errors
  - Key is invalid/expired or not authorized.
- `429` errors
  - Rate-limited by upstream; retry later.
- Port `8070` already in use
  - Stop existing proxy process or set `TERMINAL_MARKETS_PORT`.
- "No matching report data found"
  - Check proxy terminal output for `[proxy]` log lines showing API errors.
  - Verify the API key is valid and the selected city/date has USDA coverage.

## Notes
- The browser never sends credentials directly to MARS.
- City buttons in the portfolio UI are still static.
- Proxy logs all requests and API errors to stdout.
