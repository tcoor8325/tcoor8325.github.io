#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tech_tree_dir="${root_dir}/Tech Tree Project"
terminal_markets_proxy="${root_dir}/Terminal Markets/proxy_server.py"

cleanup() {
  if [[ -n "${TECH_TREE_PID:-}" ]]; then
    kill "${TECH_TREE_PID}" 2>/dev/null || true
  fi
  if [[ -n "${TERMINAL_MARKETS_PID:-}" ]]; then
    kill "${TERMINAL_MARKETS_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ -z "${MARS_API_KEY:-}" && -z "${TERMINAL_MARKETS_MARS_API_KEY:-}" ]]; then
  echo "Warning: MARS API key is not set. Export MARS_API_KEY before querying Terminal Markets."
fi

echo "Starting Tech Tree server on http://localhost:3000"
(
  cd "${tech_tree_dir}"
  npm start
) &
TECH_TREE_PID=$!

echo "Starting Terminal Markets proxy on http://localhost:8070"
python3 "${terminal_markets_proxy}" &
TERMINAL_MARKETS_PID=$!

echo "Starting portfolio server on http://localhost:8000"
python3 -m http.server 8000 --directory "${root_dir}"
