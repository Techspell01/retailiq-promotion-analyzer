#!/usr/bin/env sh
# Starts RetailIQ: mock source API, backend and frontend. Ctrl+C to stop.
cd "$(dirname "$0")" || exit 1
command -v uv >/dev/null 2>&1 || { echo "uv is not installed: https://docs.astral.sh/uv/getting-started/installation/"; exit 1; }
exec uv run --project backend python run.py "$@"
