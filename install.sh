#!/usr/bin/env bash
# Deploy AI Observability Control Tower: demo data + Databricks App.
# Usage: ./install.sh [options]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MIN_CLI_VERSION="0.218.0"
TARGET="${BUNDLE_TARGET:-dev}"
PROFILE="${DATABRICKS_PROFILE:-}"
CATALOG="${CATALOG:-}"
SCHEMA="${SCHEMA:-}"
SKIP_DATA=false
SKIP_APP=false
SKIP_BUILD=false
VALIDATE_ONLY=false
AUTO_APPROVE=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Deploy demo data job and Control Tower Databricks App.

Options:
  -t, --target TARGET     Bundle target (default: dev)
  -p, --profile PROFILE   Databricks CLI profile (default: active profile)
  -c, --catalog CATALOG   Unity Catalog name (default: msahil from bundle)
  -s, --schema SCHEMA     Unity Catalog schema (default: ai_observability)
      --skip-data         Deploy only; do not run demo_data job
      --skip-app          Skip Control Tower app deploy/run
      --skip-build        Skip frontend build (use existing frontend/dist)
      --validate-only     Validate bundle config and exit
      --auto-approve      Pass --auto-approve to bundle deploy
  -h, --help              Show this help

Environment:
  BUNDLE_TARGET, DATABRICKS_PROFILE, CATALOG, SCHEMA

Examples:
  ./install.sh
  ./install.sh --target prod --auto-approve
  ./install.sh --skip-data --skip-app
EOF
}

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

version_ge() {
  local current="${1#v}" required="${2#v}"
  [[ "$(printf '%s\n%s\n' "$required" "$current" | sort -V | head -n1)" == "$required" ]]
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--target) TARGET="$2"; shift 2 ;;
    -p|--profile) PROFILE="$2"; shift 2 ;;
    -c|--catalog) CATALOG="$2"; shift 2 ;;
    -s|--schema) SCHEMA="$2"; shift 2 ;;
    --skip-data) SKIP_DATA=true; shift ;;
    --skip-app) SKIP_APP=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --validate-only) VALIDATE_ONLY=true; shift ;;
    --auto-approve) AUTO_APPROVE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (use --help)" ;;
  esac
done

profile_args=()
[[ -n "$PROFILE" ]] && profile_args=(--profile "$PROFILE")

run_databricks() {
  if [[ ${#profile_args[@]} -gt 0 ]]; then
    databricks "$@" "${profile_args[@]}"
  else
    databricks "$@"
  fi
}

grant_app_uc_access() {
  local app_name="ai-obs-control-tower-${TARGET}"
  local catalog="${CATALOG:-msahil}"
  local schema="${SCHEMA:-ai_observability}"
  local sp_id

  sp_id="$(run_databricks apps get "$app_name" -o json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('service_principal_client_id',''))" || true)"
  if [[ -z "$sp_id" ]]; then
    log "Warning: could not resolve app service principal; skipping UC grants"
    return 0
  fi

  log "Granting USE CATALOG on ${catalog} to app service principal..."
  run_databricks grants update catalog "${catalog}" --json "{\"changes\":[{\"principal\":\"${sp_id}\",\"add\":[\"USE_CATALOG\"]}]}"

  log "Granting USE SCHEMA + SELECT on ${catalog}.${schema} to app service principal..."
  run_databricks grants update schema "${catalog}.${schema}" --json "{\"changes\":[{\"principal\":\"${sp_id}\",\"add\":[\"USE_SCHEMA\",\"SELECT\"]}]}"
}

cli_version="$(databricks --version 2>/dev/null | awk '{print $NF}' | tr -d 'v' || true)"
[[ -n "$cli_version" ]] || die "Databricks CLI not found. Install: https://docs.databricks.com/aws/en/dev-tools/cli/install"

if ! version_ge "$cli_version" "$MIN_CLI_VERSION"; then
  die "Databricks CLI $cli_version is too old (need >= $MIN_CLI_VERSION)"
fi
log "Databricks CLI v$cli_version"

if ! run_databricks auth describe &>/dev/null; then
  die "Not authenticated. Run: databricks auth login${PROFILE:+ --profile $PROFILE}"
fi
log "Workspace auth OK${PROFILE:+ (profile: $PROFILE)}"

if ! $SKIP_BUILD && ! $SKIP_APP; then
  log "Building React frontend..."
  ./build.sh
fi

validate_args=(bundle validate --strict -t "$TARGET")
deploy_args=(bundle deploy -t "$TARGET")
run_data_args=(bundle run demo_data -t "$TARGET")
run_app_args=(bundle run control_tower -t "$TARGET")

log "Validating bundle (target: $TARGET)..."
run_databricks "${validate_args[@]}"

if $VALIDATE_ONLY; then
  log "Validation passed."
  exit 0
fi

if $AUTO_APPROVE; then
  deploy_args+=(--auto-approve)
fi

log "Deploying bundle (target: $TARGET)..."
run_databricks "${deploy_args[@]}"

if ! $SKIP_APP; then
  log "Starting Control Tower app (bundle run control_tower)..."
  run_databricks "${run_app_args[@]}"
  grant_app_uc_access
fi

if $SKIP_DATA; then
  log "Install complete (--skip-data). Run data job: databricks bundle run demo_data -t $TARGET"
  exit 0
fi

job_params=()
[[ -n "$CATALOG" ]] && job_params+=(--catalog="$CATALOG")
[[ -n "$SCHEMA" ]] && job_params+=(--schema="$SCHEMA")

log "Running demo_data job (drop schema → load 12 tables, ~3–5 min)..."
if [[ ${#job_params[@]} -gt 0 ]]; then
  run_databricks "${run_data_args[@]}" -- "${job_params[@]}"
else
  run_databricks "${run_data_args[@]}"
fi

log "Install complete."
if ! $SKIP_APP; then
  log "Open the app from Databricks → Apps → ai-obs-control-tower-${TARGET}"
fi
