# Unified AI Observability Control Tower

One control tower across **AI traces**, **Unity AI Gateway**, **infrastructure**, and **ITSM** — unifying signals from **Databricks**, **New Relic**, and **ServiceNow** into a single investigation surface.

Built as a [Databricks App](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/) with a [Declarative Automation Bundle](https://docs.databricks.com/aws/en/dev-tools/bundles/).

---

## About the application

The **Unified AI Observability Control Tower** gives platform and operations teams a shared view of AI agent health, gateway traffic, infrastructure correlation, and incident response. Instead of switching between siloed tools, you follow a single correlation chain from an MLflow run through Unity AI Gateway and New Relic APM to a ServiceNow incident.

The application is modeled on a **hub-and-spoke AI platform** (E.ON SE context): **28 agents** across **6 regions** (DE hub plus IT, SE, HU, RO, NL), with observability data stored in Unity Catalog and queried live through the app.

### What each platform contributes

| Platform | Role | Question it answers |
|----------|------|---------------------|
| **Databricks** | AI-native observability | What failed in the AI estate, why, and what is the governance impact? |
| **New Relic** | Infrastructure correlation | Is this an AI problem or an infrastructure problem? |
| **ServiceNow** | Automated response & remediation | Who is responsible, what is the SLA impact, and what is the fix? |

**Integration message:** Databricks owns the AI-native signal (traces, cost, quality, governance). New Relic owns the infrastructure signal (APM, network, compute health). ServiceNow owns the action (incidents, remediation, compliance). Together they eliminate blind spots that exist when any platform operates alone.

### Two ways to use the app

1. **Guided walkthroughs** — Follow three hero scenarios (A → B → C, ~15 minutes) that show how different failure modes appear — or disappear — on each platform.
2. **Exploration** — Browse agents, traces, gateway traffic, incidents, and the cross-platform correlation timeline at your own pace.

On first visit, a welcome modal offers **Explore scenarios** (recommended entry) or **Go to overview**.

---

## Features by page

| Page | Route | What you can do |
|------|-------|-----------------|
| **Overview** | `/` | Executive summary, live platform signals (Databricks / New Relic / ServiceNow), fleet KPIs, correlation chain diagram, and quick launch into hero scenarios. |
| **Scenarios** | `/scenarios` | Index of three guided walkthroughs with platform visibility matrix — see which platforms detect each failure pattern. |
| **Scenario walkthrough** | `/scenarios/a`, `/b`, `/c` | Six-step guided investigation per scenario with live charts, cross-platform timeline, and key message sidebar. Append `?presenter=1` for a step navigation bar. |
| **Agents** | `/agents` | Registry of all 28 agents — region, cloud, framework, team, and status. |
| **Traces** | `/traces` | MLflow run explorer — status, latency, feedback; correlated with gateway and downstream systems. |
| **Unity AI Gateway** | `/gateway` | Gateway KPIs (requests, error rate, tokens, latency), correlation chain, and request log with New Relic / ServiceNow link indicators. |
| **Tool Access** | `/tools` | Unity Catalog governance — MCP tool catalog and access patterns (denied access discoverable via correlation). |
| **Incidents** | `/incidents` | ServiceNow incidents and change requests — priority, MTTR, affected agents, links to correlation view. |
| **Correlation** | `/correlation` | Unified cross-platform timeline with platform filters; investigate how MLflow runs, gateway requests, APM transactions, infra metrics, and incidents connect. |

### Overview highlights

- **Executive command center** — Unified visibility banner with integrated stack badges.
- **Live platform signals** — Per-platform metrics: gateway errors, failed runs, denied access (Databricks); critical alerts, APM errors, queue depth (New Relic); open P1/P2, MTTR, pending changes (ServiceNow).
- **Key performance indicators** — Active agents, run success rate, open incidents, gateway error rate (30-day window).
- **Cross-platform correlation chain** — Visual flow: MLflow → AI Gateway → New Relic → ServiceNow, with live linked-chain count.
- **Hero scenario cards** — Launch guided walkthroughs directly from the landing page.

### Correlation chain

Investigations follow a consistent join path across Unity Catalog tables:

```
MLflow run → AI Gateway request → New Relic APM transaction → ServiceNow incident
```

Additional links include tool access logs (governance), infra metrics (New Relic), and agent registry (blast radius). The **Correlation** page and scenario walkthroughs surface this chain end to end.

---

## Hero scenarios (guided walkthroughs)

Three first-class scenarios illustrate different observability gaps. Recommended order: **A → B → C**.

| Scenario | Title | Theme | Platforms | Incident | Story |
|----------|-------|-------|-----------|----------|-------|
| **A** | Cross-Agent Cascade | Detect → Correlate → Remediate | Databricks ✓ · New Relic ✓ · ServiceNow ✓ | `INC0012010` (P1) | Full-stack lifecycle: spoke failure triggers hub retry storm; root cause is Azure infra in IT, not agent logic. |
| **B** | Token Exhaustion | Gradual AI-layer degradation | Databricks ✓ · New Relic ✗ · ServiceNow ✓ | `INC0012002` (P3) | Token and error-rate trends over days — invisible to infrastructure monitoring until ServiceNow opens a ticket hours later. |
| **C** | Model Drift | Silent quality failure | Databricks ✓ · New Relic ✗ · ServiceNow ✓ | `INC0012005` (P3) | Runs succeed while quality metrics degrade; only AI-native signals reveal drift before ITSM response. |

Each walkthrough has **6 numbered steps** with platform-colored navigation, live data for the anomaly window, a **cross-platform timeline**, and a **key message** panel. Scenario B step 5 deliberately shows New Relic with no alerts — highlighting when infrastructure monitoring is silent.

**Opening framing:** Three very different failure modes — each invisible to at least one platform alone.

**Closing framing:** Without unified AI observability, Scenario A looks like an agent bug, Scenario B goes undetected for days, and Scenario C goes undetected for weeks.

---

## Data behind the app

All metrics, charts, and tables are loaded from **Unity Catalog** via the app backend (no client-side mock data in production paths).

| Setting | Default |
|---------|---------|
| Catalog | `msahil` |
| Schema | `ai_observability` |
| Tables | 12 Delta tables (agents, MLflow runs/metrics, gateway usage, tool access, New Relic APM/infra, ServiceNow incidents/changes) |
| Time window | 30 days |

Full schema, FK relationships, and scenario definitions are documented in [`setup/0 - Setup.ipynb`](setup/0%20-%20Setup.ipynb).

---

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | React · Tailwind CSS · Recharts · React Router |
| Backend | FastAPI · Databricks SQL Connector |
| Data | Unity Catalog `msahil.ai_observability` (12 Delta tables) |
| Deploy | DAB — data job + Control Tower app |

Detailed UI specification: [`specifications/user-interface.md`](specifications/user-interface.md)

---

## Prerequisites

- [Databricks CLI](https://docs.databricks.com/aws/en/dev-tools/cli/) v0.218.0+ (v1.x recommended)
- Workspace auth: `databricks auth login`
- Node.js 18+ and npm (frontend build)
- SQL warehouse with access to the UC catalog/schema

---

## Deploy and run

```bash
# Build frontend, deploy bundle, start app, load data
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

### Manual steps

```bash
# 1. Build React UI
./build.sh

# 2. Deploy bundle resources (job + app)
databricks bundle deploy

# 3. Start / update the Control Tower app
databricks bundle run control_tower

# 4. Load observability data (~3–5 min)
databricks bundle run demo_data
```

Open **Databricks → Compute → Apps → `ai-obs-control-tower-dev`**.

---

## Local development

Authenticate with OAuth (not the `DEFAULT` PAT profile if API tokens are disabled):

```bash
databricks auth login --host https://e2-demo-field-eng.cloud.databricks.com --profile oauth-default
```

Terminal 1 — API:

```bash
./scripts/dev-api.sh
```

Or manually:

```bash
export DATABRICKS_CONFIG_PROFILE=oauth-default
export DATABRICKS_HOST=https://e2-demo-field-eng.cloud.databricks.com
export DATABRICKS_WAREHOUSE_ID=862f1d757f0424f7   # dbdemos-shared-endpoint
export CATALOG=msahil
export SCHEMA=ai_observability
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

If you see `exit status 45` on token refresh, re-run `databricks auth login` for your profile. The API caches CLI tokens with a lock to avoid concurrent refresh races.

Terminal 2 — frontend with API proxy:

```bash
cd frontend && npm install && npm run dev
```

Visit http://localhost:5173

---

## Bundle resources

| Resource | Key | Description |
|----------|-----|-------------|
| Job | `demo_data` | Serverless: drop schema → generate 12 UC tables |
| App | `control_tower` | Unified AI Observability Control Tower |

## Data notebooks

| Notebook | Purpose |
|----------|---------|
| `setup/0 - Setup.ipynb` | Schema spec and scenario definitions |
| `setup/1 - Demo Data.ipynb` | Manual data generation alternative |
| `src/notebooks/demo_data.ipynb` | Bundle job notebook |
| `src/notebooks/drop_schema.py` | Schema reset before data load |
