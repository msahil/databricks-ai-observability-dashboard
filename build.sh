#!/usr/bin/env bash
# Build React frontend for Databricks App deployment.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required to build the frontend." >&2
  exit 1
fi

npm ci 2>/dev/null || npm install
npm run build

echo "Frontend built → frontend/dist"
