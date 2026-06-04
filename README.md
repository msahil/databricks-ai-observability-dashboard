# Unified AI Observability Control Tower

Cross-platform observability dashboard for **Databricks** (MLflow + Unity AI Gateway), **New Relic**, and **ServiceNow** — built as a [Databricks App](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/) with a [Declarative Automation Bundle](https://docs.databricks.com/aws/en/dev-tools/bundles/).

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | React · Tailwind CSS · Recharts · React Router |
| Backend | FastAPI · Databricks SQL Connector |
| Data | Unity Catalog `msahil.ai_observability` (12 Delta tables) |
| Deploy | DAB — demo data job + Control Tower app |

## Prerequisites

- [Databricks CLI](https://docs.databricks.com/aws/en/dev-tools/cli/) v0.218.0+ (v1.x recommended)
- Workspace auth: `databricks auth login`
- Node.js 18+ and npm (frontend build)
- SQL warehouse with access to the UC catalog/schema

## Quick start

```bash
# Build frontend, deploy bundle, start app, load demo data
./install.sh

# Validate bundle only
./install.sh --validate-only

# Deploy without loading data
./install.sh --skip-data

# Deploy data job only (skip app)
./install.sh --skip-app
```

Override catalog/schema:

```bash
CATALOG=my_catalog SCHEMA=my_schema ./install.sh
```

Override SQL warehouse (if auto-lookup fails):

```bash
databricks bundle deploy -t dev --var warehouse_id=<warehouse-id>
```

## Manual steps

```bash
# 1. Build React UI
./build.sh

# 2. Deploy bundle resources (job + app)
databricks bundle deploy

# 3. Start / update the Control Tower app
databricks bundle run control_tower

# 4. Load demo data (~3–5 min)
databricks bundle run demo_data
```

Open **Databricks → Compute → Apps → `ai-obs-control-tower-dev`**.

## Local development

Terminal 1 — API (requires `DATABRICKS_WAREHOUSE_ID`, auth via CLI):

```bash
export DATABRICKS_WAREHOUSE_ID=<your-warehouse-id>
export CATALOG=msahil
export SCHEMA=ai_observability
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Terminal 2 — frontend with API proxy:

```bash
cd frontend && npm install && npm run dev
```

Visit http://localhost:5173

## Bundle resources

| Resource | Key | Description |
|----------|-----|-------------|
| Job | `demo_data` | Serverless: drop schema → generate 12 UC tables |
| App | `control_tower` | Unified AI Observability Control Tower |

## UI specification

See [`specifications/user-interface.md`](specifications/user-interface.md) for the full Control Tower UI spec, hero scenarios, and presenter flow.

## Data notebooks

| Notebook | Purpose |
|----------|---------|
| `setup/0 - Setup.ipynb` | Schema spec and scenario definitions |
| `setup/1 - Demo Data.ipynb` | Manual data generation alternative |
| `src/notebooks/demo_data.ipynb` | Bundle job notebook |
| `src/notebooks/drop_schema.py` | Schema reset before data load |
