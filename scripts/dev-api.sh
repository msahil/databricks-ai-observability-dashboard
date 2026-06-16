#!/usr/bin/env bash
# Start the local API with OAuth profile auth (not the DEFAULT PAT profile).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROFILE="${DATABRICKS_CONFIG_PROFILE:-oauth-default}"
HOST="${DATABRICKS_HOST:-https://e2-demo-field-eng.cloud.databricks.com}"
WAREHOUSE_ID="${DATABRICKS_WAREHOUSE_ID:-862f1d757f0424f7}"

if ! databricks auth token --profile "$PROFILE" >/dev/null 2>&1; then
  echo "OAuth profile '$PROFILE' is not valid. Run:"
  echo "  databricks auth login --host $HOST --profile $PROFILE"
  exit 1
fi

export DATABRICKS_CONFIG_PROFILE="$PROFILE"
export DATABRICKS_HOST="$HOST"
export DATABRICKS_WAREHOUSE_ID="$WAREHOUSE_ID"
export CATALOG="${CATALOG:-msahil}"
export SCHEMA="${SCHEMA:-ai_observability}"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

echo "Profile:  $PROFILE"
echo "Host:     $HOST"
echo "Warehouse:$WAREHOUSE_ID"
echo "API:      http://localhost:8000"

exec .venv/bin/python -m uvicorn backend.main:app --reload --port 8000
