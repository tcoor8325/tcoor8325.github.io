#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tech_tree_dir="${root_dir}/Tech Tree Project"
terminal_markets_proxy="${root_dir}/Terminal Markets/proxy_server.py"
domesday_server="${root_dir}/Domesday/domesday_server.py"
env_files=(
  "${HOME}/.config/terminal-markets.env"
  "${root_dir}/.env.local"
  "${root_dir}/Terminal Markets/.env.local"
)

cleanup() {
  if [[ -n "${TECH_TREE_PID:-}" ]]; then
    kill "${TECH_TREE_PID}" 2>/dev/null || true
  fi
  if [[ -n "${TERMINAL_MARKETS_PID:-}" ]]; then
    kill "${TERMINAL_MARKETS_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

for env_file in "${env_files[@]}"; do
  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${env_file}"
    set +a
    echo "Loaded environment from ${env_file}"
  fi
done

if [[ -z "${MARS_API_KEY:-}" && -z "${TERMINAL_MARKETS_MARS_API_KEY:-}" ]]; then
  echo "Warning: MARS API key is not set. Set MARS_API_KEY or TERMINAL_MARKETS_MARS_API_KEY via env or an env file."
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
python3 "${domesday_server}" --host 0.0.0.0 --port 8000
