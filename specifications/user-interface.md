# User Interface Specification

> **App name:** Unified AI Observability Control Tower  
> **Primary purpose:** Unified observability across Databricks, New Relic, and ServiceNow — with 3 hero scenario walkthroughs from `setup/0 - Setup.ipynb`  
> **Customer context:** E.ON SE — hub-and-spoke AI platform across DE, IT, SE, HU, RO, NL  
> **Stack:** React · Tailwind CSS · Databricks App (FastAPI backend)  
> **Data source:** Unity Catalog `msahil.ai_observability` — 12 Delta tables loaded by `./install.sh` (DAB job `demo_data`) per `setup/0 - Setup.ipynb`

### Customer-facing naming rules

| Use | Do not use in UI copy, nav, titles, or CTAs |
|-----|---------------------------------------------|
| **Unified AI Observability Control Tower** (full app name) | Demo, demo, POC, sample, test, mock |
| **Control Tower** (short form in compact layouts) | Demo app, demo mode, demo data |
| **Scenarios**, **Guided walkthrough**, **Overview** | Demo script, start demo, demo flow |
| **Hero scenarios** (internal spec / code comments only) | — |

The word "demo" may appear in **internal** repo artifacts only (`demo_data` job name, setup notebooks, presenter script §12). It must **never** render in the customer-facing application.

The Control Tower serves two experiences:

1. **Guided scenarios** — walk through Scenario A → B → C (~15 min) showing cross-platform observability
2. **Exploration** — full observability views (Agents, Traces, Correlation, etc.)

---

## 0. Data Source Contract

**All UI data MUST come from Unity Catalog.** No mock data, hardcoded fixtures, or synthetic client-side generation in production paths. The data notebooks are the single source of truth for schema, row counts, FK relationships, and anomaly scenarios.

| Rule | Requirement |
|------|-------------|
| Catalog | `msahil` |
| Schema | `ai_observability` |
| Table reference | Always fully qualified: `msahil.ai_observability.<table>` |
| Backend access | SQL Warehouse queries via FastAPI → Databricks SQL Statement Execution API |
| Time window | Default 30 days (matches data generation range) |
| Joins | Follow FK chain defined in `0 - Setup.ipynb` Quick Reference |

### 0.1 Table inventory

| Table | Platform | Rows | Primary Key | UI usage |
|-------|----------|------|-------------|----------|
| `msahil.ai_observability.agent_registry` | Databricks | 28 | `agent_id` | Agents page, heatmap, filters |
| `msahil.ai_observability.mlflow_experiments` | Databricks | 28 | `experiment_id` | Trace detail (1:1 with agent) |
| `msahil.ai_observability.mlflow_runs` | Databricks | ~50K | `run_id` | Traces page, Overview charts, Correlation |
| `msahil.ai_observability.mlflow_run_metrics` | Databricks | ~270K | `record_id` | Trace metric sparklines, agent KPIs |
| `msahil.ai_observability.ai_gateway_usage` | Databricks | ~50K | `request_id` | Gateway page, token/cost KPIs |
| `msahil.ai_observability.tool_access_logs` | Databricks | ~83K | `access_id` | Tool Access page, governance alerts |
| `msahil.ai_observability.mcp_catalog` | Databricks | 15 | `tool_id` | MCP tool registry panel |
| `msahil.ai_observability.user_profiles` | Databricks | ~133 | `user_id` | Correlation blast-radius panel |
| `msahil.ai_observability.newrelic_infra_metrics` | New Relic | ~1.3M | `metric_id` | Correlation infra gauges |
| `msahil.ai_observability.newrelic_apm_transactions` | New Relic | ~50K | `transaction_id` | Correlation APM chain |
| `msahil.ai_observability.servicenow_incidents` | ServiceNow | 10 | `incident_id` | Incidents page, Overview banner |
| `msahil.ai_observability.servicenow_change_requests` | ServiceNow | 6 | `change_id` | Incidents page (linked changes) |

### 0.2 Cross-platform correlation chain

All Correlation View joins MUST follow this path (from `0 - Setup.ipynb`):

```
msahil.ai_observability.mlflow_runs.run_id
  → msahil.ai_observability.ai_gateway_usage.request_tags['run_id']
msahil.ai_observability.ai_gateway_usage.request_id
  → msahil.ai_observability.newrelic_apm_transactions.linked_gateway_request_id
timestamp alignment
  → msahil.ai_observability.newrelic_infra_metrics (same anomaly windows)
anomaly detection
  → msahil.ai_observability.servicenow_incidents.opened_at
msahil.ai_observability.mlflow_runs.run_id
  → msahil.ai_observability.tool_access_logs.trace_id
msahil.ai_observability.agent_registry.agent_id
  → msahil.ai_observability.mlflow_runs.params['agent_id']
  → msahil.ai_observability.tool_access_logs.agent_id
  → msahil.ai_observability.servicenow_incidents.affected_agents
msahil.ai_observability.user_profiles.agents_used
  → msahil.ai_observability.agent_registry.agent_id (array contains)
```

### 0.3 Backend query pattern

Every API endpoint executes parameterized SQL against the SQL Warehouse. Example:

```python
# backend/queries/overview.py
CATALOG = "msahil"
SCHEMA = "ai_observability"
TABLE = f"{CATALOG}.{SCHEMA}.mlflow_runs"

QUERY = f"""
SELECT
  COUNT(*) AS total_runs,
  SUM(CASE WHEN status = 'FINISHED' THEN 1 ELSE 0 END) AS successful_runs
FROM {TABLE}
WHERE start_time >= :start_time AND start_time < :end_time
"""
```

Frontend hooks (`useObservabilityData`) call FastAPI routes; routes run UC SQL and return JSON. **Never query UC tables directly from the browser.**

### 0.4 Hero Scenarios — Control Tower core

The Control Tower MUST showcase **exactly three hero scenarios** from `setup/0 - Setup.ipynb` § **Demo Outline — 3 Scenarios** (internal notebook reference). These are the only first-class guided walkthroughs. The other 7 injected anomalies remain discoverable via Correlation and exploratory pages — they do **not** get dedicated walkthroughs.

#### Platform roles (shown in app header / sidebar footer)

| Platform | Role | Question it answers | UI color token |
|----------|------|---------------------|----------------|
| **Databricks** | AI-Native Observability | What failed in our AI estate, why, and what's the governance impact? | `platform-databricks` |
| **New Relic** | Infrastructure Correlation | Was this an AI problem or an infrastructure problem? | `platform-newrelic` |
| **ServiceNow** | Automated Response & Remediation | Who's responsible, what's the SLA impact, and what's the fix? | `platform-servicenow` |

**Key integration message** (display on `/scenarios` wrap-up and Act 4):

> Databricks owns the *AI-native signal* (traces, cost, quality, governance).  
> New Relic owns the *infrastructure signal* (APM, network, compute health).  
> ServiceNow owns the *action* (incidents, remediation, compliance).  
> The integrated stack eliminates blind spots that exist when any platform operates alone.

#### Hero scenario registry

| Hero | Notebook | Theme | Regions | Primary agents | Endpoint / entity | Incident | Change | Time window |
|------|----------|-------|---------|----------------|-------------------|----------|--------|-------------|
| **A** | Scenario 10 | Detect → Correlate → Remediate | DE, IT, HU, RO | `DE-Orchestrator-Agent`, `IT-Demand-Forecast-Agent`, HU/RO spokes | `de-orchestrator-serving`, `it-azure-openai-instance` | `INC0012010` (P1) | `CHG0005003` (Emergency) | Day 25, 09:15–09:45 CET |
| **B** | Scenario 2 | Gradual degradation detection | IT | `IT-Customer-Support-Agent` | `it-customer-agent-endpoint` | `INC0012002` (P3) | — | Days 8–10 (gradual) |
| **C** | Scenario 5 | Silent quality degradation | SE | `SE-Energy-Forecast-Agent` | `se-forecast-endpoint` | `INC0012005` (P3) | — | Days 20–27 (gradual) |

Time windows are computed at runtime as `START_DATE + day_offset` from data config (default `START_DATE = END_DATE - 30 days`). Backend exposes resolved timestamps via `/api/scenarios/{id}/window`.

#### Walkthrough narrative arc

```
Act 0  Set the stage     → Hub-and-spoke map, 28 agents, healthy baseline (Days 1–4)
Act 1  Scenario A       → FULL integrated stack (Databricks + New Relic + ServiceNow)
Act 2  Scenario B       → AI-native detection that infra monitoring misses
Act 3  Scenario C       → Silent failure only quality metrics reveal
Act 4  Wrap-up          → Platform visibility matrix + closing line
```

**Opening line:** "Let me show you three very different failure modes — each one invisible to at least one of these platforms alone."

**Closing line:** "Without unified AI observability, Scenario A looks like an agent bug, Scenario B goes undetected for days, and Scenario C goes undetected for weeks."

Each hero scenario is a **guided walkthrough** at `/scenarios/:id` with 6 numbered steps matching the notebook's Step | Platform | What to show | Query / View table. Step content is loaded from UC via parameterized SQL — presenter narration text lives in `lib/scenarios.ts` (static copy from notebook); chart/table data is always live from UC.

### 0.5 Control Tower architecture

#### Default route & modes

| Mode | Route | Behavior |
|------|-------|----------|
| **Overview** (default) | `/` | Hub-and-spoke map, KPIs, hero scenario launch cards |
| **Guided scenarios** | `/scenarios` | Hero scenario index — recommended entry for walkthroughs |
| **Scenario walkthrough** | `/scenarios/a` \| `/scenarios/b` \| `/scenarios/c` | 6-step stepper with live UC data |
| **Explore** | `/agents`, `/traces`, … | Full observability console |

On first load, show a one-time **welcome modal** (`<WelcomeModal>`):
- App name: **Unified AI Observability Control Tower**
- Tagline: "One control tower across AI traces, Unity AI Gateway, infrastructure, and ITSM"
- E.ON hub-and-spoke context (DE = Hub, 5 spokes)
- 28 agents · 6 regions · **Databricks · New Relic · ServiceNow**
- CTA: `btn-primary` "Explore scenarios" → `/scenarios`
- Dismiss: "Go to overview" → `/`

#### Presenter controls (walkthrough pages only — optional `?presenter=1` query param)

Fixed bottom bar on `/scenarios/:id` when presenter mode enabled:

```
fixed bottom-0 inset-x-0 lg:left-60 z-40 border-t border-db-gray-200 bg-white px-4 py-3
flex items-center justify-between
```

| Control | Action |
|---------|--------|
| ← Previous step | Decrement step index |
| Next step → | Increment; on step 6 → next scenario or wrap-up |
| Talking points | Toggle `<PresenterNotes>` panel (presenter mode only) |
| Jump to scenario | Dropdown: A / B / C |
| Time window | Read-only badge showing resolved anomaly window |

Progress persisted in `sessionStorage`: `scenario.progress = { a: 6, b: 3, c: 0 }`.

#### Backend API (scenario walkthroughs)

| Endpoint | Returns |
|----------|---------|
| `GET /api/scenarios` | Hero registry (§0.4 table) + completion state |
| `GET /api/scenarios/{id}` | Scenario metadata + 6 step definitions |
| `GET /api/scenarios/{id}/steps/{n}` | UC query result for step N |
| `GET /api/scenarios/{id}/window` | Resolved `start_time`, `end_time` for anomaly window |

All step queries live in `backend/queries/hero_scenarios.py` — one function per step, parameterized by catalog/schema/time window.

### 0.6 Three-Platform Integration Layer (mandatory UI)

The Control Tower's primary value proposition is the **interplay** between observability platforms — not any single vendor view. The UI MUST make this integration visible and persistent, not buried in Correlation or scenario step 3.

#### Databricks signal decomposition

Do not treat Databricks as a monolith. Always show three sub-signals with distinct icons/labels:

| Sub-signal | UC tables | Customer label | Icon |
|------------|-----------|----------------|------|
| MLflow Traces | `mlflow_runs`, `mlflow_run_metrics` | Agent Traces | trace icon |
| **Unity AI Gateway** | `ai_gateway_usage` | **Unity AI Gateway** | gateway icon |
| UC Governance | `tool_access_logs`, `mcp_catalog` | Governance & Tools | shield icon |

Unity AI Gateway is the **primary Databricks differentiator** in customer conversations — give it equal visual weight to MLflow in integration views.

#### Persistent components (every page)

These render on **all routes** below the top bar:

**1. `<PlatformIntegrationStrip>`** — always-visible 3-column strip

```
grid grid-cols-3 gap-px bg-db-gray-200 rounded-lg overflow-hidden mb-4
```

| Column | Header | Live mini-metrics (from UC) | Link |
|--------|--------|----------------------------|------|
| Databricks | Logo + "AI-Native" | Gateway error % · failed runs · denied access count | `/gateway` |
| New Relic | Logo + "Infrastructure" | CRITICAL alerts · APM error rate · queue depth max | `/correlation?platform=newrelic` |
| ServiceNow | Logo + "Remediation" | Open P1/P2 · avg MTTR · pending changes | `/incidents` |

Each column uses platform color token as top border (`border-t-4 border-platform-*`). When a platform has **no signal** for the current filter (Scenario B step 5 pattern), show green "All clear" — that absence is itself the story.

**2. `<SignalFlowDiagram>`** — compact horizontal flow (Overview, Scenarios, Correlation)

Always show the correlation chain as a live, clickable diagram:

```
[MLflow Run] → [AI Gateway Request] → [New Relic APM] → [ServiceNow Incident]
     │                  │                      │                    │
  run_id          request_id         linked_gateway_request_id   incident_id
```

Tailwind: `flex items-center gap-1 text-2xs font-mono overflow-x-auto py-2 px-3 bg-db-gray-50 rounded-md border border-db-gray-200`

- Nodes: `rounded px-2 py-1 border` colored by platform token
- Arrows: `ArrowRightIcon h-3 w-3 text-db-gray-400`
- Active node (when drilling down): `ring-2 ring-db-red`
- Click node → navigate to filtered view for that entity

Data: populated from cross-platform join in §0.2; on Overview show aggregate link counts ("847 correlated chains in last 24h").

#### Page-level integration emphasis

| Page | Integration pattern |
|------|---------------------|
| **Overview** (`/`) | **3-column platform health** row below `<SignalFlowDiagram>` — one card per platform with top 3 signals; hero scenario cards show **platform visibility badges** (which platforms detect each scenario) |
| **Scenarios index** | `<PlatformRolesStrip>` + each hero card displays `Sees: DB ✓ NR ✓ SN ✓` / `Misses: NR ✗` upfront |
| **Scenario walkthrough** | Split main panel: **60% active step chart** + **40% `<CrossPlatformTimeline>`** showing all 3 platforms' events simultaneously for the anomaly window — user never loses cross-platform context while stepping |
| **AI Gateway** | Every request row shows inline NR APM link icon if `linked_gateway_request_id` exists; banner: "Gateway traffic correlated with New Relic APM and ServiceNow incidents" |
| **Traces** | Trace detail cross-links: Gateway request · NR transaction · SN incident — always 3 pills in header |
| **Incidents** | Each incident card shows **source_system** badge + upstream signal icons (which platform triggered the alert) + linked Gateway endpoint |
| **Correlation** | Default view — unified timeline is the integration canvas |

#### Hero scenario cards — platform visibility (customer-facing)

Each `<HeroScenarioCard>` MUST show which platforms detect the failure:

| Scenario | Databricks | New Relic | ServiceNow | Story |
|----------|:----------:|:---------:|:----------:|-------|
| A — Cascade | ✓ Detects | ✓ Root cause | ✓ Remediates | Full stack |
| B — Token | ✓ Detects | ✗ Silent | ✓ Lags 4h | AI-only signal |
| C — Drift | ✓ Detects | ✗ Silent | ✓ Lags 72h | Quality-only signal |

Render as: `flex gap-2 mt-2` with `<PlatformBadge platform="databricks" active={true} />` — inactive platforms shown muted (`opacity-40`) not hidden.

#### Scenario B & C — "absence of signal" emphasis

When New Relic shows nothing, the UI must **actively highlight the gap** — not just show an empty chart:

```
┌─────────────────────────────────────────────────────────┐
│  Databricks ✓          New Relic — no alerts           │
│  [error rate chart]    [green empty state]              │
│                        "Infra monitoring sees nothing"  │
│  ServiceNow ✓ (delayed)                                 │
│  [INC0012002 card]                                      │
└─────────────────────────────────────────────────────────┘
```

Use side-by-side 3-column layout in walkthrough main panel for steps 4–6 of Scenario B and steps 5–6 of Scenario C.

#### Integration copy (customer-facing labels)

| Context | Label |
|---------|-------|
| Top bar subtitle | "Databricks · New Relic · ServiceNow" |
| Welcome modal | "One control tower across AI traces, infrastructure, and ITSM" |
| Correlation page title | "Cross-Platform Correlation" |
| Gateway page subtitle | "Unity AI Gateway — correlated with infrastructure and incidents" |

---

## 1. Design Principles

1. **Unity Catalog only** — Every metric, chart, table row, and filter option is backed by a query against `msahil.ai_observability.*`. If a column doesn't exist in the data notebook schema, don't display it.
2. **Control Tower first** — Default landing is Overview with hero scenario cards; guided walkthroughs at `/scenarios` (§0.4–0.5). Exploratory pages supplement via nav.
3. **Three hero scenarios in order** — Recommended walkthrough path is Act 0 → A → B → C → Wrap-up (~15 min). UI suggests order but allows jumping.
4. **Single pane of glass** — Within each scenario step, Databricks, New Relic, and ServiceNow signals appear together — never siloed by vendor tab.
5. **Three-platform interplay always visible** — The integration of Databricks (MLflow + **Unity AI Gateway** + UC governance), New Relic, and ServiceNow must be visually unmistakable on every page — not only inside scenario walkthroughs (see §0.6).
6. **Anomaly-first** — Overview and Scenarios surfaces highlight active incidents and hero scenario cards before aggregate KPIs.
7. **Drill-down from scenarios** — Every walkthrough step links to the relevant explore page (Traces, Gateway, Correlation) pre-filtered to the anomaly window.
8. **No "demo" language** — Customer-facing copy uses Control Tower branding only (see naming rules above).
9. **Enterprise density** — Information-dense layouts for platform engineers and SREs.
10. **Tailwind-native** — All styling via utility classes and `@apply` component layers.

---

## 2. Tailwind Configuration

### 2.1 Base setup

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Databricks-adjacent palette (not official brand)
        db: {
          red: '#FF3621',
          'red-dark': '#E02815',
          orange: '#FFAB00',
          navy: '#0B2026',
          'navy-light': '#1B3139',
          teal: '#00A972',
          'teal-dark': '#008F5D',
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
        },
        // Semantic status colors
        status: {
          healthy: '#00A972',
          warning: '#FFAB00',
          critical: '#FF3621',
          info: '#2272B4',
          muted: '#9CA3AF',
        },
        // Platform badges
        platform: {
          databricks: '#FF3621',
          newrelic: '#1CE783',
          servicenow: '#81B5A1',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        panel: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
      animation: {
        pulse-slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
```

### 2.2 Component layer (`src/index.css`)

Use `@layer components` for repeated patterns. Prefer composition over deep `@apply` chains.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply inline-flex items-center gap-2 rounded-md bg-db-red px-4 py-2 text-sm font-medium text-white
           hover:bg-db-red-dark focus:outline-none focus:ring-2 focus:ring-db-red focus:ring-offset-2
           disabled:cursor-not-allowed disabled:opacity-50 transition-colors;
  }
  .btn-secondary {
    @apply inline-flex items-center gap-2 rounded-md border border-db-gray-300 bg-white px-4 py-2
           text-sm font-medium text-db-gray-700 hover:bg-db-gray-50 focus:outline-none
           focus:ring-2 focus:ring-db-red focus:ring-offset-2 transition-colors;
  }
  .card {
    @apply rounded-lg border border-db-gray-200 bg-white shadow-card;
  }
  .card-header {
    @apply flex items-center justify-between border-b border-db-gray-100 px-4 py-3;
  }
  .card-body {
    @apply p-4;
  }
  .badge {
    @apply inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium uppercase tracking-wide;
  }
  .badge-healthy  { @apply badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200; }
  .badge-warning  { @apply badge bg-amber-50 text-amber-700 ring-1 ring-amber-200; }
  .badge-critical { @apply badge bg-red-50 text-red-700 ring-1 ring-red-200; }
  .badge-info     { @apply badge bg-sky-50 text-sky-700 ring-1 ring-sky-200; }
  .input-field {
    @apply block w-full rounded-md border-db-gray-300 text-sm shadow-sm
           focus:border-db-red focus:ring-db-red;
  }
  .table-compact th {
    @apply px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-db-gray-500;
  }
  .table-compact td {
    @apply px-3 py-2 text-sm text-db-gray-700 whitespace-nowrap;
  }
  .sidebar-link {
    @apply flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-db-gray-300
           hover:bg-db-navy-light hover:text-white transition-colors;
  }
  .sidebar-link-active {
    @apply sidebar-link bg-db-navy-light text-white border-l-2 border-db-red;
  }
}
```

---

## 3. Application Shell

### 3.1 Layout structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Top bar (h-14) — logo, global time range, region filter, user   │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │ Main content area                                    │
│ (w-60)   │ max-w-screen-2xl mx-auto px-6 py-4                   │
│ fixed    │                                                      │
│ lg:block │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

| Region | Tailwind classes | Notes |
|--------|------------------|-------|
| Root | `min-h-screen bg-db-gray-50 font-sans text-db-gray-900` | Light gray canvas |
| Top bar | `sticky top-0 z-40 flex h-14 items-center border-b border-db-gray-200 bg-white px-4 lg:px-6` | Sticky header |
| Sidebar | `fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-db-navy pt-14 lg:flex` | Dark nav; hidden on mobile |
| Main | `lg:pl-60` | Offset for sidebar |
| Content | `mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8` | Responsive padding |

### 3.2 Top bar elements

| Element | Classes | Behavior |
|---------|---------|----------|
| App title | `text-lg font-semibold text-db-navy` | **Unified AI Observability Control Tower** — primary title |
| App subtitle | `text-xs text-db-gray-500` | "Databricks · New Relic · ServiceNow" |
| Short title | `text-sm font-semibold text-db-navy lg:hidden` | **Control Tower** — mobile collapsed header |
| Integration strip | below top bar, all pages | `<PlatformIntegrationStrip>` (§0.6) |
| Time range picker | `input-field w-44` | Presets: Last 1h, 24h, 7d, 30d (default), Custom |
| Region multi-select | `input-field w-36` | All, DE, IT, SE, HU, RO, NL |
| Refresh indicator | `text-2xs text-db-gray-400 animate-pulse-slow` | "Live · updated 30s ago" |
| Mobile menu toggle | `lg:hidden btn-secondary p-2` | Hamburger; opens slide-over sidebar |

### 3.3 Sidebar navigation

| Nav item | Route | Icon | Role |
|----------|-------|------|------|
| Overview | `/` | `HomeIcon` | Landing — hub-and-spoke + hero scenario cards |
| **Scenarios** | `/scenarios` | `PlayCircleIcon` | **Primary walkthrough** — hero scenario index |
| Agents | `/agents` | `CpuChipIcon` | Agent registry (28 agents) |
| Traces | `/traces` | `QueueListIcon` | MLflow runs |
| Unity AI Gateway | `/gateway` | `ArrowsRightLeftIcon` | Gateway traffic · NR + SN correlation |
| Tool Access | `/tools` | `WrenchScrewdriverIcon` | UC governance |
| Incidents | `/incidents` | `ExclamationTriangleIcon` | ServiceNow tickets |
| Correlation | `/correlation` | `LinkIcon` | **Cross-platform canvas** — MLflow → Gateway → NR → ServiceNow |

**Scenarios** renders `sidebar-link-active` on `/scenarios` and `/scenarios/:id`. Sidebar header above nav:

```
px-3 py-4 border-b border-db-navy-light
text-xs font-semibold uppercase tracking-wider text-db-gray-400
Unified AI Observability
Control Tower
```

Footer: platform role legend (§0.4) + `msahil.ai_observability` catalog badge.

---

## 4. Global Filters & State

Filters persist in URL query params (`?range=30d&regions=DE,IT&agent=...`).

| Filter | Component | UC source / Tailwind |
|--------|-----------|----------------------|
| Time range | `<Select>` | Applied as `WHERE <timestamp_col> BETWEEN :start AND :end` on all queries; `input-field` |
| Region | `<MultiSelect>` chips | `agent_registry.region`: `DE`, `IT`, `SE`, `HU`, `RO`, `NL`; selected chip: `badge-info`; unselected: `badge bg-db-gray-100 text-db-gray-600` |
| Agent | Searchable combobox | `msahil.ai_observability.agent_registry` (`agent_id`, `agent_name`); dropdown: `absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-db-gray-200 bg-white shadow-panel` |
| Status | Toggle group | `agent_registry.status` or `mlflow_runs.status`; active: `bg-db-red text-white`; inactive: `bg-db-gray-100 text-db-gray-600` |
| Platform | Checkbox row | Filter timeline by UC table (Databricks / New Relic / ServiceNow); inline `flex gap-4 text-sm` |

---

## 5. Pages

### 5.1 Overview (`/`)

**Purpose:** Landing page — fleet health, hub-and-spoke context, and entry to scenario walkthroughs. Must immediately communicate **three-platform integration** (§0.6).

#### Signal flow + platform health (below hub-and-spoke map)

**Row 1:** `<SignalFlowDiagram>` full width with live correlation count.

**Row 2:** 3-column platform health (`grid grid-cols-1 lg:grid-cols-3 gap-4`):

| Column | Platform | Key widgets | UC sources |
|--------|----------|-------------|------------|
| Left | **Databricks** | Gateway error rate · Failed runs · Top endpoint | `ai_gateway_usage`, `mlflow_runs` |
| Center | **New Relic** | CRITICAL alerts · APM error % · Max queue depth | `newrelic_infra_metrics`, `newrelic_apm_transactions` |
| Right | **ServiceNow** | Open P1/P2 · Latest incident · Pending changes | `servicenow_incidents`, `servicenow_change_requests` |

Each column: `card border-t-4` with platform color. Header includes platform logo + role from §0.4 ("AI-Native" / "Infrastructure" / "Remediation").

Within Databricks column, show **Unity AI Gateway** as a distinct sub-section (not merged with MLflow KPIs):

```
text-2xs font-semibold uppercase text-db-gray-500 mt-2
Unity AI Gateway
→ error rate, top endpoint, token volume (from ai_gateway_usage)
```

#### Hub-and-spoke map

Full-width card above hero scenario cards. SVG or CSS layout:

```
grid grid-cols-7 gap-2 items-center
```

| Node | Label | Style |
|------|-------|-------|
| Center (DE) | **Hub** — Central IT / AI Platform | `rounded-full bg-db-navy text-white px-4 py-6 text-center font-semibold` |
| Spokes | IT, SE, HU, RO, NL | `rounded-lg border-2 border-db-gray-200 p-3 text-center text-sm` |
| NL spoke | + AWS badge | `border-amber-300` (only AWS region per `agent_registry.cloud_provider`) |

Subtitle: `text-sm text-db-gray-500` — "28 agents · 6 regions · 3 observability platforms"

Data: agent counts per region from `SELECT region, COUNT(*) FROM msahil.ai_observability.agent_registry GROUP BY region`.

Healthy baseline callout (`bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm`):
"Days 1–4: 95% success rate · avg latency 200–800ms · feedback 3.8–4.5" (from notebook baseline spec).

#### Hero scenario cards (primary CTA — above KPI row)

Full-width section — `mb-6`. Three cards in `grid grid-cols-1 gap-4 lg:grid-cols-3`.

Each `<HeroScenarioCard>` links to `/scenarios/a`, `/scenarios/b`, `/scenarios/c`:

| Card | Title | Subtitle | Badge | UC anchor |
|------|-------|----------|-------|-----------|
| A | Cross-Agent Cascade | Detect → Correlate → Remediate | `badge-critical` P1 | `servicenow_incidents.number = 'INC0012010'` |
| B | Token Exhaustion | Gradual AI-layer degradation | `badge-warning` P3 | `servicenow_incidents.number = 'INC0012002'` |
| C | Model Drift | Silent quality failure | `badge-warning` P3 | `servicenow_incidents.number = 'INC0012005'` |

Card structure:
```html
<a href="/scenarios/a" class="card p-5 hover:border-db-red/40 hover:shadow-panel transition-all group">
  <div class="flex items-center justify-between">
    <span class="badge-critical">Scenario A</span>
    <ArrowRightIcon class="h-4 w-4 text-db-gray-300 group-hover:text-db-red" />
  </div>
  <h3 class="mt-3 text-lg font-semibold text-db-navy">Cross-Agent Cascade</h3>
  <p class="mt-1 text-sm text-db-gray-500">Full-stack: Databricks → New Relic → ServiceNow</p>
  <p class="mt-3 text-2xs font-mono text-db-gray-400">INC0012010 · Day 25 · DE, IT, HU, RO</p>
</a>
```

Card A subtitle: "Full-stack: Databricks → New Relic → ServiceNow" + platform badges: `DB ✓  NR ✓  SN ✓`
Card B subtitle: "AI-native trend detection — infrastructure sees nothing" + platform badges: `DB ✓  NR ✗  SN ✓`
Card C subtitle: "100% success rate — only quality metrics reveal drift" + platform badges: `DB ✓  NR ✗  SN ✓`

Each card includes `<PlatformBadge>` row per §0.6 — inactive platforms muted, not omitted.

CTA on each card: `btn-primary w-full mt-4 text-sm` → "Open walkthrough"

#### KPI row (4 tiles)

Grid: `grid grid-cols-2 gap-4 lg:grid-cols-4`

| Tile | UC source | SQL logic | Status logic |
|------|-----------|-----------|--------------|
| Active Agents | `msahil.ai_observability.agent_registry` | `COUNT(*) WHERE status = 'active'` | Green if ≥ 26 |
| Run Success Rate | `msahil.ai_observability.mlflow_runs` | `SUM(status='FINISHED') / COUNT(*)` in range | Red if < 95% |
| Open Incidents | `msahil.ai_observability.servicenow_incidents` | `COUNT(*) WHERE state NOT IN ('Resolved','Closed') AND priority IN ('P1','P2')` | Red if > 0 |
| Gateway Error Rate | `msahil.ai_observability.ai_gateway_usage` | `SUM(status_code >= 400) / COUNT(*)` in range | Amber if > 2%, red if > 5% |

Tile structure:
```html
<div class="card p-4">
  <p class="text-2xs font-medium uppercase tracking-wide text-db-gray-500">Run Success Rate</p>
  <p class="mt-1 text-3xl font-semibold text-db-navy">97.2%</p>
  <p class="mt-1 flex items-center gap-1 text-xs text-status-warning">
    <ArrowDownIcon class="h-3 w-3" /> −1.8% vs yesterday
  </p>
</div>
```

#### Active incidents banner

When open incidents exist, show above KPIs:

```
flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3
```

- Left: pulsing dot `h-2 w-2 rounded-full bg-status-critical animate-pulse`
- Title: `font-semibold text-red-800`
- Body: `servicenow_incidents.number`, `size(affected_agents)`, `mttr_minutes`
- CTA: `btn-primary text-xs py-1.5` → "Investigate in Correlation View"

Query for banner:
```sql
SELECT number, short_description, priority, size(affected_agents) AS agents_impacted, mttr_minutes
FROM msahil.ai_observability.servicenow_incidents
WHERE state NOT IN ('Resolved', 'Closed')
ORDER BY opened_at DESC;
```

#### Charts row

Grid: `grid grid-cols-1 gap-4 lg:grid-cols-2`

| Chart | UC table | Key columns | Chart library |
|-------|----------|-------------|---------------|
| Run volume & failures (30d) | `msahil.ai_observability.mlflow_runs` | `start_time`, `status` | Recharts area chart, stacked failures in `fill-status-critical/20` |
| Gateway latency P50/P99 | `msahil.ai_observability.ai_gateway_usage` | `event_time`, `latency_ms` | Recharts line chart, P99 in `stroke-db-red` |
| Token usage by region | `msahil.ai_observability.ai_gateway_usage` JOIN `mlflow_runs` | `total_tokens`, `params['region']` | Recharts bar chart, one bar per region |
| Incident timeline | `msahil.ai_observability.servicenow_incidents` | `opened_at`, `priority`, `number` | Horizontal timeline with severity-colored markers |

Chart container: `card card-body h-72`

#### Agent health heatmap

Full-width card. Grid of agent tiles:

```
grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7
```

Each agent tile (`rounded-md border p-2 text-center text-xs`) sourced from `msahil.ai_observability.agent_registry` joined with run stats:
- Background by health: derived from `mlflow_runs` error rate in last 24h — `bg-emerald-50 border-emerald-200` (healthy), `bg-amber-50 border-amber-200` (degraded), `bg-red-50 border-red-200` (critical or in `servicenow_incidents.affected_agents`)
- `agent_name` truncated with `truncate`
- `region` badge: `text-2xs font-mono text-db-gray-500` (DE, IT, SE, HU, RO, NL)
- `agent_framework` icon (`AgentBricks`, `Azure AI Agent Service`, `Amazon Bedrock Agents`) as 16px SVG

Click → `/agents/:agent_id` (route param = `agent_registry.agent_id`)

---

### 5.2 Agents (`/agents`)

**Purpose:** Registry browser for all 28 agents.

#### Toolbar

```
flex flex-wrap items-center justify-between gap-3 mb-4
```

- Search: `input-field max-w-xs` with `MagnifyingGlassIcon`
- Framework filter pills: `flex gap-2` — AgentBricks, Azure AI, Bedrock
- Sort: `input-field w-40` — Name, Error rate, Latency, Cost

#### Agent table

`card overflow-hidden` with `overflow-x-auto`

| Column | UC source | Format |
|--------|-----------|--------|
| Agent | `agent_registry.agent_name`, `agent_registry.agent_id` | Name + `agent_id` truncated in `font-mono text-2xs text-db-gray-400` |
| Region | `agent_registry.region` | ISO code badge |
| Framework | `agent_registry.agent_framework` | Colored badge |
| Cloud | `agent_registry.cloud_provider` | `AWS` or `Azure` |
| Status | `agent_registry.status` | `badge-healthy` (`active`) / `badge-warning` (`inactive`) / `badge-critical` (`deprecated`) |
| Runs (24h) | `mlflow_runs` via `params['agent_id']` | Count, right-aligned |
| Error rate | `mlflow_runs.status` | Sparkline + percentage; red text if > 5% |
| Avg latency | `mlflow_run_metrics.metric_name = 'latency_ms'` | `font-mono` ms value |
| Cost (30d) | `mlflow_run_metrics.metric_name = 'total_cost_usd'` | `$X,XXX` formatted |
| Actions | — | `btn-secondary text-xs py-1` → "Traces" |

Base query:
```sql
SELECT
  a.agent_id, a.agent_name, a.region, a.cloud_provider, a.agent_framework,
  a.status, a.owner_team, a.deployment_env,
  COUNT(r.run_id) AS runs_24h,
  AVG(CASE WHEN r.status != 'FINISHED' THEN 1.0 ELSE 0.0 END) AS error_rate
FROM msahil.ai_observability.agent_registry a
LEFT JOIN msahil.ai_observability.mlflow_runs r
  ON r.params['agent_id'] = a.agent_id
  AND r.start_time >= :start_24h
GROUP BY ALL;
```

Row hover: `hover:bg-db-gray-50 cursor-pointer`
Anomaly-highlighted rows: `agent_id` IN open `servicenow_incidents.affected_agents` → `bg-red-50/50 border-l-2 border-status-critical`

#### Agent detail drawer (slide-over)

Trigger: row click. Panel: `fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-panel overflow-y-auto`

Sections (all from UC):
1. **Header** — `agent_registry`: `agent_name`, `region`, `agent_framework`, `owner_team`, `cloud_provider`, `created_at`
2. **Health summary** — 4 mini KPIs from `mlflow_runs` + `mlflow_run_metrics` in `grid grid-cols-2 gap-3`
3. **Recent runs** — last 20 from `msahil.ai_observability.mlflow_runs` WHERE `params['agent_id'] = :agent_id`
4. **Gateway endpoints** — distinct `endpoint_name` from `msahil.ai_observability.ai_gateway_usage` JOIN runs on `request_tags['run_id']`
5. **Tool usage** — top 5 `resource_path` from `msahil.ai_observability.tool_access_logs` WHERE `agent_id = :agent_id`
6. **Related incidents** — `msahil.ai_observability.servicenow_incidents` WHERE `array_contains(affected_agents, :agent_id)`

Close button: `absolute top-4 right-4 rounded-md p-1 hover:bg-db-gray-100`

---

### 5.3 Traces (`/traces`)

**Purpose:** MLflow run explorer with metric drill-down.

#### Split layout

```
grid grid-cols-1 gap-4 lg:grid-cols-3
```

- Left (2/3): trace list table
- Right (1/3): selected trace detail panel (`card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto`)

#### Trace list filters

Quick filters as pill buttons above table (all against `msahil.ai_observability.mlflow_runs`):
- Failed only: `status != 'FINISHED'`
- High latency: `aggregated_metrics['latency_ms'] > 5000`
- Context overflow: `params['error_type'] = 'context_overflow'`
- Anomaly window: pre-set time ranges from `0 - Setup.ipynb` Anomaly Injection Parameters table

Pill active: `bg-db-red text-white rounded-full px-3 py-1 text-xs`
Pill inactive: `bg-db-gray-100 text-db-gray-600 rounded-full px-3 py-1 text-xs hover:bg-db-gray-200`

#### Trace detail panel

| Section | UC source / columns |
|---------|---------------------|
| Run metadata | `mlflow_runs`: `run_id`, `run_name`, `experiment_id`, `status`, `start_time`, `end_time`, `created_by` |
| Experiment | `mlflow_experiments.name` JOIN on `experiment_id` |
| Params | `mlflow_runs.params` MAP — includes `agent_id`, `region`, `model_name`, `framework`, `error_type` |
| Aggregated metrics | `mlflow_runs.aggregated_metrics` — `latency_ms`, `input_tokens`, `output_tokens`, `total_cost_usd`, `feedback_score`, `error_rate` |
| Metric timeline | `mlflow_run_metrics` WHERE `run_id = :run_id` — spark charts per `metric_name` |
| Cross-links | Gateway: `ai_gateway_usage` ON `request_tags['run_id']`; Tools: `tool_access_logs` ON `trace_id = run_id`; APM: `newrelic_apm_transactions` ON `linked_gateway_request_id` |

Status badges:
- `FINISHED` → `badge-healthy`
- `FAILED` → `badge-critical`
- `KILLED` → `badge-warning`

---

### 5.4 Unity AI Gateway (`/gateway`)

**Purpose:** Monitor Unity AI Gateway traffic, routing, and token economics — **as the Databricks bridge to New Relic and ServiceNow**.

Page subtitle (`text-sm text-db-gray-500`): "Unity AI Gateway — correlated with New Relic APM and ServiceNow incidents"

**Integration banner** (below subtitle, all gateway views):
```
rounded-md border border-platform-databricks/20 bg-platform-databricks/5 px-4 py-2 text-sm
```
"Every gateway request can be traced to an MLflow run, a New Relic APM transaction, and a ServiceNow incident via the correlation chain (§0.2)."

Request table: add **Correlated** column — icons for NR APM link + SN incident when FK exists (`linked_gateway_request_id`, incident time overlap).

#### Summary cards

Grid: `grid grid-cols-2 gap-4 lg:grid-cols-5`

All metrics from `msahil.ai_observability.ai_gateway_usage`:

| Card | SQL |
|------|-----|
| Total requests | `COUNT(request_id)` in range |
| Error rate | `SUM(status_code >= 400) / COUNT(*)` |
| Avg latency | `AVG(latency_ms)` |
| Total tokens | `SUM(total_tokens)` |
| Est. cost | `SUM(input_tokens + output_tokens)` × model pricing lookup on `destination_model` |

#### Endpoint table

Grouped by `endpoint_name`, `endpoint_id`. Expandable rows showing:
- Status code distribution from `status_code` (200, 429, 400, 500, 503)
- Top `destination_model` values
- Fallback rate parsed from `routing_information` MAP

Expand chevron: `ChevronDownIcon h-4 w-4 text-db-gray-400 transition-transform rotate-180 when open`

#### Status code breakdown chart

Stacked bar chart by hour. Color mapping:
- 2xx: `bg-status-healthy`
- 429: `bg-status-warning`
- 4xx: `bg-orange-400`
- 5xx: `bg-status-critical`

#### Request detail modal

On row click. Modal overlay: `fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4`
Modal: `card max-w-2xl w-full max-h-[80vh] overflow-y-auto`

Show full row from `msahil.ai_observability.ai_gateway_usage` — all columns including `routing_information`, `request_tags`, `token_details`, `invocation_metadata` — in a syntax-highlighted `<pre class="font-mono text-xs bg-db-gray-900 text-db-gray-100 rounded-md p-4 overflow-x-auto">`.

---

### 5.5 Tool Access (`/tools`)

**Purpose:** Unity Catalog governance — what agents read, write, and execute.

#### Two-column layout

```
grid grid-cols-1 gap-4 lg:grid-cols-5
```

- MCP Catalog (2/5): `msahil.ai_observability.mcp_catalog`
- Access log stream (3/5): `msahil.ai_observability.tool_access_logs`

#### MCP catalog cards

Each row from `mcp_catalog` as a card:
```
flex items-start gap-3 rounded-lg border border-db-gray-200 p-3 hover:border-db-red/30 transition-colors
```

- `tool_name`: `font-medium text-sm`
- `tool_type` badge: `uc_function`, `vector_search`, `rest_api`, `sql_query` — each with distinct `badge-*` color
- Stats row: `call_count_30d`, `avg_latency_ms` in `text-2xs text-db-gray-500`
- `owner_region` flag
- `catalog_path` on hover tooltip

#### Access log table

From `msahil.ai_observability.tool_access_logs`. Highlight denied access (`granted = false`):
- Row: `bg-red-50 border-l-2 border-status-critical`
- Icon: `ShieldExclamationIcon h-4 w-4 text-status-critical`

Columns: `timestamp`, `agent_id` (JOIN `agent_registry.agent_name`), `resource_type`, `resource_path`, `access_type`, `row_count`, `bytes_transferred`, `granted`

Join to MCP catalog: `tool_access_logs.resource_path` → `mcp_catalog.tool_name` (where `resource_type = 'mcp_tool'`)

Filter toggle: "Show denied only" — `flex items-center gap-2 text-sm`

---

### 5.6 Incidents (`/incidents`)

**Purpose:** ServiceNow incident and change request management view.

#### Incident cards (not table)

Vertical stack: `space-y-3`

Each incident card:
```
card p-4 border-l-4
```

Border color by priority:
- P1: `border-l-status-critical`
- P2: `border-l-status-warning`
- P3/P4: `border-l-status-info`

Card content from `msahil.ai_observability.servicenow_incidents`:
- Header row: `number`, `priority` badge, `state` badge (`New`, `In Progress`, `On Hold`, `Resolved`, `Closed`)
- Title: `short_description` in `font-semibold text-db-navy`
- Description: `description` in collapsible prose block
- Meta grid (`grid grid-cols-2 gap-2 text-xs text-db-gray-500`): `opened_at`, `mttr_minutes`, `affected_users_count`, `size(affected_agents)`, `category`, `subcategory`, `assignment_group`, `source_system`
- Affected agents: chips from `affected_agents` array — JOIN `agent_registry` for names
- Affected regions: chips from `affected_regions` array
- CTA row: `flex gap-2 mt-3` — "Open Correlation View", "View Change Request" (if linked)

List query:
```sql
SELECT * FROM msahil.ai_observability.servicenow_incidents
ORDER BY opened_at DESC;
```

#### Change requests sub-section

From `msahil.ai_observability.servicenow_change_requests`. Collapsible table:

| Column | Field |
|--------|-------|
| Change # | `number` |
| Type | `type` (`Standard`, `Normal`, `Emergency`) |
| State | `state` |
| Risk | `risk` |
| Parent incident | `parent_incident_id` → JOIN `servicenow_incidents.number` |
| Window | `planned_start`, `planned_end` |
| Team | `assignment_group` |

---

### 5.7 Scenario Walkthroughs (`/scenarios`, `/scenarios/:id`)

**Purpose:** Guided cross-platform investigation for the 3 hero scenarios in `0 - Setup.ipynb`. Core Control Tower experience for live customer sessions.

#### Scenario index (`/scenarios`)

Page title: `text-2xl font-semibold text-db-navy` — **Scenarios**

Three `<HeroScenarioCard>` components plus:

**Walkthrough banner** (`rounded-lg border border-db-navy/10 bg-db-navy/5 px-4 py-3 mb-6`):
"Recommended order: **A → B → C** (~15 min). Each scenario reveals a failure pattern visible to one platform but invisible to others."

**Progress tracker:** step dots for A, B, C — `bg-db-red` when all 6 steps complete (`sessionStorage`).

**Platform roles strip:** inline 3-column summary from §0.4 (Databricks / New Relic / ServiceNow).

Each card shows: hero ID badge, theme, subtitle, incident number, regions, estimated duration (A: 5 min, B: 4 min, C: 4 min).

#### Guided walkthrough layout (`/scenarios/:id`)

Route params: `a` | `b` | `c`

```
grid grid-cols-1 gap-4 xl:grid-cols-12 pb-20   ← pb-20 clears presenter bar
```

| Panel | Span | Content |
|-------|------|---------|
| Step navigator | `xl:col-span-3` | Steps 1–6 with platform-colored icons; click to jump |
| Main content | `xl:col-span-6` | **Split panel:** 60% active step chart + 40% `<CrossPlatformTimeline>` (all 3 platforms, same time window) |
| Context sidebar | `xl:col-span-3` | Platform badge, key message, `<SignalFlowDiagram>` mini, drill-down link |

The `<CrossPlatformTimeline>` is **always visible** during walkthroughs — users must see Databricks, New Relic, and ServiceNow events concurrently, not one platform at a time in isolation.

Step navigator item states:
- Active: `bg-db-red/10 border-l-2 border-db-red`
- Complete: `opacity-60` + `CheckCircleIcon text-status-healthy`
- Platform dot: `w-2 h-2 rounded-full` using platform color tokens

Header: scenario title, theme subtitle, priority badge, anomaly time window badge (`font-mono text-2xs`).

---

#### Scenario A — Cross-Agent Cascading Failure (`/scenarios/a`)

**Notebook ref:** Scenario 10  
**Theme:** "Detect → Correlate → Remediate" — the full lifecycle  
**Key message:** Single spoke failure → Hub retry storm → multi-region cascade. Root cause was Azure infra in IT, not agent logic.  
**Regions:** DE → IT → HU → RO  
**Agents:** `DE-Orchestrator-Agent` (hub), `IT-Demand-Forecast-Agent` (root cause spoke), HU + RO collateral  
**Incident:** `INC0012010` (P1, MTTR 30 min, 450 users, `affected_regions: [DE, IT, HU, RO]`)  
**Change:** `CHG0005003` (Emergency — circuit breaker implementation)

**Three-act structure** (shown as phase labels above steps 1–2, 3–4, 5–6):

| Act | Label | Steps | Platform focus |
|-----|-------|-------|----------------|
| Act 1 | Databricks Detects (T+0) | 1–2 | MLflow failures + Gateway 429/500 cascade |
| Act 2 | New Relic Correlates (T+2) | 3–4 | Azure OpenAI CRITICAL + orchestrator queue depth |
| Act 3 | ServiceNow Remediates (T+5) | 5–6 | P1 incident + emergency change request |

| Step | Platform | What to show (notebook) | UI component | UC query |
|------|----------|-------------------------|--------------|----------|
| 1 | Databricks | IT agent failures trigger orchestrator retry storm | Failed runs timeline | `SELECT * FROM msahil.ai_observability.mlflow_runs WHERE status = 'FAILED' AND start_time BETWEEN :win_start AND :win_end ORDER BY start_time` |
| 2 | Databricks | AI Gateway 429s cascading to HU/RO | Status code stacked bar by region | `SELECT status_code, COUNT(*) FROM msahil.ai_observability.ai_gateway_usage WHERE status_code IN (429,500,504) AND event_time BETWEEN :win_start AND :win_end GROUP BY status_code` |
| 3 | New Relic | Azure OpenAI error rate spike in IT (root cause = infra) | Infra alert panel — CRITICAL | `SELECT * FROM msahil.ai_observability.newrelic_infra_metrics WHERE entity_name = 'it-azure-openai-instance' AND alert_severity = 'CRITICAL' AND timestamp BETWEEN :win_start AND :win_end` |
| 4 | New Relic | DE orchestrator queue depth + request rate spike | Dual-axis line chart | `SELECT timestamp, metric_name, metric_value FROM msahil.ai_observability.newrelic_infra_metrics WHERE entity_name = 'de-orchestrator-serving' AND metric_name IN ('queue_depth', 'request_rate_per_sec') AND timestamp BETWEEN :win_start AND :win_end` |
| 5 | ServiceNow | P1 incident auto-created, 4 regions affected | `<IncidentCard>` full detail | `SELECT * FROM msahil.ai_observability.servicenow_incidents WHERE number = 'INC0012010'` |
| 6 | ServiceNow | Emergency change: circuit breaker | `<ChangeRequestCard>` | `SELECT * FROM msahil.ai_observability.servicenow_change_requests WHERE number = 'CHG0005003'` |

**Presenter notes** (toggle panel):
- Without New Relic, this looks like an agent logic bug — root cause was Azure OpenAI connectivity in IT
- Without Databricks, New Relic sees API errors but not the retry storm cascading to HU/RO
- Without ServiceNow, MTTR would be hours of manual triage instead of 30 min with auto P1 + change request

Step 3 highlight banner: `border-l-4 border-platform-newrelic bg-sky-50/50 p-4` — **"Root cause: infrastructure, not agent logic"**

Drill-down link on each step: "Open in Correlation →" pre-filters to Scenario A window.

---

#### Scenario B — Token Budget Exhaustion (`/scenarios/b`)

**Notebook ref:** Scenario 2  
**Theme:** "Gradual degradation detection" — trend-based alerting vs threshold-based  
**Key message:** Invisible to infrastructure monitoring. Only MLflow token metrics + Gateway 400s catch the 3-day trend. Fix is config (input chunking), not infra.  
**Region:** IT  
**Agent:** `IT-Customer-Support-Agent` (resolve `agent_id` via `agent_registry`)  
**Endpoint:** `it-customer-agent-endpoint`  
**Incident:** `INC0012002` (P3, 4-hour detection lag, category: AI Platform)

| Step | Platform | What to show (notebook) | UI component | UC query |
|------|----------|-------------------------|--------------|----------|
| 1 | Databricks | error_rate trending up over 3 days (2% → 18%) | Trend line chart | `SELECT metric_time, metric_value FROM msahil.ai_observability.mlflow_run_metrics m JOIN msahil.ai_observability.mlflow_experiments e ON m.experiment_id = e.experiment_id JOIN msahil.ai_observability.agent_registry a ON e.name = a.agent_name WHERE a.agent_name = 'IT-Customer-Support-Agent' AND m.metric_name = 'error_rate' AND m.metric_time BETWEEN :win_start AND :win_end ORDER BY metric_time` |
| 2 | Databricks | input_tokens growing: avg 80K → 130K | Trend line chart | Same join, `metric_name = 'input_tokens'` |
| 3 | Databricks | Gateway 400s with input_tokens > 120K | Error table | `SELECT request_id, event_time, input_tokens, status_code FROM msahil.ai_observability.ai_gateway_usage WHERE status_code = 400 AND endpoint_name = 'it-customer-agent-endpoint' AND event_time BETWEEN :win_start AND :win_end ORDER BY input_tokens DESC LIMIT 20` |
| 4 | Databricks | Feedback score correlated drop | Trend line chart | Same join, `metric_name = 'feedback_score'` |
| 5 | New Relic | **No infrastructure signal** — proves AI-layer problem | `<InfraEmptyState>` | `SELECT COUNT(*) FROM msahil.ai_observability.newrelic_infra_metrics WHERE region = 'IT' AND alert_severity IS NOT NULL AND timestamp BETWEEN :win_start AND :win_end` → **must return 0** |
| 6 | ServiceNow | P3 ticket after 4 hours (trend alert threshold) | `<IncidentCard>` | `SELECT * FROM msahil.ai_observability.servicenow_incidents WHERE number = 'INC0012002'` |

**Presenter notes:**
- New Relic shows **zero infrastructure signals** — all healthy; failure is at the AI layer
- Only Databricks (MLflow metrics + AI Gateway) detects the *trend* of input_tokens over 3 days
- Fix is input chunking config — wrong team would be paged without AI-native observability

Step 5 — pivotal UX moment. `<InfraEmptyState>`:
```
bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center
✓ All infrastructure metrics healthy for IT region.
This failure is invisible to infra monitoring — only AI-native observability detected it.
```

---

#### Scenario C — Model Drift — Silent Quality Degradation (`/scenarios/c`)

**Notebook ref:** Scenario 5  
**Theme:** "No errors, no alerts, just declining quality" — the hardest problem  
**Key message:** 100% FINISHED runs, 200 status codes, zero infra alerts. Only feedback_score + output_tokens + Gateway destination_model reveal drift after 7 days.  
**Region:** SE  
**Agent:** `SE-Energy-Forecast-Agent`  
**Endpoint:** `se-forecast-endpoint`  
**Incident:** `INC0012005` (P3, 72-hour SLA breach, root cause: provider model version change)

| Step | Platform | What to show (notebook) | UI component | UC query |
|------|----------|-------------------------|--------------|----------|
| 1 | Databricks | 100% status=FINISHED, 200 status codes | Green success KPI banner | `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'FINISHED' THEN 1 ELSE 0 END) AS finished FROM msahil.ai_observability.mlflow_runs r JOIN msahil.ai_observability.agent_registry a ON r.params['agent_id'] = a.agent_id WHERE a.agent_name = 'SE-Energy-Forecast-Agent' AND r.start_time BETWEEN :win_start AND :win_end` |
| 2 | Databricks | feedback_score declining 4.2 → 3.1 over 7 days | Trend line with annotation | Same agent join, `metric_name = 'feedback_score'` |
| 3 | Databricks | Gateway model version change (subtle forensic evidence) | `<ModelVersionDiff>` table | `SELECT DISTINCT destination_model, event_time FROM msahil.ai_observability.ai_gateway_usage WHERE endpoint_name = 'se-forecast-endpoint' AND event_time BETWEEN :win_start AND :win_end ORDER BY event_time` — highlight `gpt-4o-2025-06-01` |
| 4 | Databricks | Output tokens decreasing (shorter forecasts) | Trend line chart | Same agent join, `metric_name = 'output_tokens'` |
| 5 | New Relic | Zero infra alerts — all green for SE | `<InfraHealthGrid>` all green | `SELECT entity_name, metric_name, metric_value, alert_severity FROM msahil.ai_observability.newrelic_infra_metrics WHERE region = 'SE' AND timestamp BETWEEN :win_start AND :win_end` — all `alert_severity IS NULL` |
| 6 | ServiceNow | P3 ticket only after 72 hours (SLA breach) | `<IncidentCard>` | `SELECT * FROM msahil.ai_observability.servicenow_incidents WHERE number = 'INC0012005'` |

**Presenter notes:**
- Nightmare scenario: 100% success rate, zero alerts — traditional monitoring sees nothing
- Only MLflow feedback_score + output quality metrics reveal the problem after 7 days
- AI Gateway `destination_model` provides forensic evidence: `gpt-4o-2025-05-13` → `gpt-4o-2025-06-01`
- Without quality-loop observability, undetected until business users escalate weeks later

Step 1: large `badge-healthy` "100% Success Rate" + amber subtext: "Traditional monitoring sees nothing wrong."

Step 3: `<ModelVersionDiff>` — side-by-side `font-mono text-xs`:
- Before: `gpt-4o-2025-05-13`
- After: `gpt-4o-2025-06-01` (highlighted `ring-2 ring-status-warning`)

---

#### Wrap-up — Act 4 (`/scenarios` footer, shown after completing Scenario C)

**Platform visibility matrix** (`<PlatformVisibilityMatrix>`):

| Detection pattern | Scenario A | Scenario B | Scenario C |
|-------------------|:----------:|:----------:|:----------:|
| Databricks AI signal | ✓ Retry storm | ✓ Token trend | ✓ Quality metrics |
| New Relic infra signal | ✓ Root cause found | ✗ Nothing | ✗ Nothing |
| ServiceNow action | ✓ P1 + CHG (30 min MTTR) | ✓ P3 config fix | ✓ P3 model pin |
| Blind spot without integration | Infra root cause hidden | 3-day AI-layer blind spot | Weeks undetected |

**Walkthrough summary** (from notebook):

```
Scenario A (Cascade) → FULL integrated stack working together
Scenario B (Token)   → AI-native detection infra monitoring misses
Scenario C (Drift)   → Silent failure only quality metrics reveal
```

Display **Key integration message** blockquote (§0.4) + **Closing line**.

CTAs: `btn-primary` "Explore all 28 agents" (`/agents`) · `btn-secondary` "Free-form Correlation" (`/correlation`)

---

### 5.8 Correlation View (`/correlation`)

**Purpose:** Free-form cross-platform investigation. Pre-populated when arriving from a hero scenario step; also supports ad-hoc exploration of all 10 injected anomalies.

#### Layout

Three-panel investigation workspace:

```
grid grid-cols-1 gap-4 xl:grid-cols-12
```

| Panel | Span | Content |
|-------|------|---------|
| Timeline | `xl:col-span-5` | Unified event stream |
| Signal detail | `xl:col-span-4` | Selected event metadata |
| Blast radius | `xl:col-span-3` | Affected agents, users, infra |

#### Unified timeline

Vertical timeline with platform-colored markers:

| Platform | Marker class | UC table | Timestamp column |
|----------|--------------|----------|------------------|
| Databricks MLflow | `border-l-4 border-platform-databricks` | `msahil.ai_observability.mlflow_runs` | `start_time` |
| AI Gateway | `border-l-4 border-db-orange` | `msahil.ai_observability.ai_gateway_usage` | `event_time` |
| New Relic APM | `border-l-4 border-platform-newrelic` | `msahil.ai_observability.newrelic_apm_transactions` | `timestamp` |
| New Relic Infra | `border-l-4 border-platform-newrelic/60` | `msahil.ai_observability.newrelic_infra_metrics` | `timestamp` |
| ServiceNow | `border-l-4 border-platform-servicenow` | `msahil.ai_observability.servicenow_incidents` | `opened_at` |
| UC Access | `border-l-4 border-purple-400` | `msahil.ai_observability.tool_access_logs` | `timestamp` |

Timeline item structure:
```
relative pl-6 pb-6 border-l border-db-gray-200 last:border-l-0
```

- Dot: `absolute -left-1.5 top-1 h-3 w-3 rounded-full` (color matches platform)
- Timestamp: `font-mono text-2xs text-db-gray-400`
- Event summary: `text-sm font-medium`
- Severity tag if applicable

Click event → populate Signal detail panel.

#### Correlation chain visualization

When a trace is selected, show the join path as a horizontal flow:

```
msahil.ai_observability.mlflow_runs.run_id
  → msahil.ai_observability.ai_gateway_usage.request_id
  → msahil.ai_observability.newrelic_apm_transactions.transaction_id
  → msahil.ai_observability.servicenow_incidents.incident_id
```

Each node: `rounded-lg border border-db-gray-200 px-3 py-2 text-xs font-mono bg-white`
Arrows: `ArrowRightIcon h-4 w-4 text-db-gray-300`
Active node: `ring-2 ring-db-red border-db-red`

#### Blast radius panel

- **Agents affected:** `servicenow_incidents.affected_agents` → JOIN `agent_registry`
- **Users impacted:** `user_profiles` WHERE `arrays_overlap(agents_used, affected_agents)` — show `user_email`, `department`, `region`
- **Infra signals:** `newrelic_infra_metrics` WHERE `entity_name` matches region and `alert_severity IN ('WARNING','CRITICAL')` — mini gauges for `cpu_percent`, `memory_percent`, `queue_depth`, `connection_pool_active`
- **Estimated cost impact:** SUM `mlflow_run_metrics.metric_value` WHERE `metric_name = 'total_cost_usd'` in anomaly window

#### Hero scenario quick-load

Dropdown at top — **3 options only** (not 10). Selecting a hero scenario navigates to `/scenarios/:id` or pre-filters this view:

| Hero | Maps to | Time window | UC anchor |
|------|---------|-------------|-----------|
| A — Cross-Agent Cascade | Scenario 10 | Day 25, 09:15–09:45 CET | `INC0012010` |
| B — Token Exhaustion | Scenario 2 | Days 8–10 | `INC0012002` |
| C — Model Drift | Scenario 5 | Days 20–27 | `INC0012005` |

Link from each option: `btn-secondary text-xs` → "Open walkthrough" (`/scenarios/:id`)

Selecting a hero scenario in Correlation View:
1. Sets time range to anomaly window (computed from `START_DATE` + day offset in backend config)
2. Runs unified timeline query across UC event tables
3. Opens linked `servicenow_incidents` record in signal detail panel

---

## 6. Shared Components

### 6.1 Component inventory

| Component | Path | Key Tailwind |
|-----------|------|--------------|
| `<PlatformIntegrationStrip>` | `components/integration/PlatformIntegrationStrip.tsx` | Persistent 3-column strip — all pages |
| `<SignalFlowDiagram>` | `components/integration/SignalFlowDiagram.tsx` | MLflow → Gateway → NR → ServiceNow chain |
| `<CrossPlatformTimeline>` | `components/integration/CrossPlatformTimeline.tsx` | Unified event stream during walkthroughs |
| `<PlatformBadge>` | `components/ui/PlatformBadge.tsx` | Platform dot + label; `active` prop for visibility matrix |
| `<PlatformHealthCard>` | `components/integration/PlatformHealthCard.tsx` | Overview 3-column health |
| `<WelcomeModal>` | `components/scenarios/WelcomeModal.tsx` | First-load Control Tower intro |
| `<PresenterBar>` | `components/scenarios/PresenterBar.tsx` | Fixed bottom step navigation (presenter mode) |
| `<PresenterNotes>` | `components/scenarios/PresenterNotes.tsx` | Talking points panel (presenter mode only) |
| `<HeroScenarioCard>` | `components/scenarios/HeroScenarioCard.tsx` | Overview + `/scenarios` index cards |
| `<ScenarioStepNav>` | `components/scenarios/ScenarioStepNav.tsx` | Platform-colored step list |
| `<ScenarioStepPanel>` | `components/scenarios/ScenarioStepPanel.tsx` | Live UC data for active step |
| `<PlatformVisibilityMatrix>` | `components/scenarios/PlatformVisibilityMatrix.tsx` | Act 4 wrap-up table |
| `<InfraEmptyState>` | `components/scenarios/InfraEmptyState.tsx` | Scenario B step 5 — zero infra alerts |
| `<InfraHealthGrid>` | `components/scenarios/InfraHealthGrid.tsx` | Scenario C step 5 — all-green gauges |
| `<ModelVersionDiff>` | `components/scenarios/ModelVersionDiff.tsx` | Scenario C step 3 — destination_model diff |
| `<HubSpokeMap>` | `components/scenarios/HubSpokeMap.tsx` | Overview — E.ON architecture diagram |
| `<IncidentCard>` | `components/IncidentCard.tsx` | ServiceNow incident from UC |
| `<ChangeRequestCard>` | `components/ChangeRequestCard.tsx` | ServiceNow change from UC |
| `<KpiTile>` | `components/KpiTile.tsx` | `card p-4` |
| `<StatusBadge>` | `components/StatusBadge.tsx` | `badge-*` variants |
| `<PlatformBadge>` | `components/PlatformBadge.tsx` | Platform color dot + label |
| `<RegionBadge>` | `components/RegionBadge.tsx` | ISO code in `font-mono text-2xs` |
| `<AgentChip>` | `components/AgentChip.tsx` | `inline-flex items-center gap-1 rounded-full bg-db-gray-100 px-2 py-0.5 text-xs` |
| `<DataTable>` | `components/DataTable.tsx` | `table-compact w-full` with sticky header `sticky top-0 bg-white` |
| `<TimeRangePicker>` | `components/TimeRangePicker.tsx` | Preset buttons + custom date inputs |
| `<Sparkline>` | `components/Sparkline.tsx` | Inline SVG, 60×20px, stroke color by trend |
| `<EmptyState>` | `components/EmptyState.tsx` | Centered icon + message, `py-12 text-center text-db-gray-400` |
| `<LoadingSkeleton>` | `components/LoadingSkeleton.tsx` | `animate-pulse bg-db-gray-200 rounded` |
| `<ErrorBoundary>` | `components/ErrorBoundary.tsx` | Red alert card with retry button |

### 6.2 Chart theming (Recharts)

Consistent chart colors via Tailwind tokens passed as props:

```tsx
const CHART_COLORS = {
  primary: '#FF3621',
  secondary: '#1B3139',
  success: '#00A972',
  warning: '#FFAB00',
  grid: '#E5E7EB',
  axis: '#9CA3AF',
};
```

Chart wrapper: `card card-body`
Tooltip: custom — `rounded-md border border-db-gray-200 bg-white px-3 py-2 text-xs shadow-panel`

### 6.3 Toast notifications

Bottom-right stack: `fixed bottom-4 right-4 z-50 flex flex-col gap-2`

Toast variants:
- Success: `border-l-4 border-l-status-healthy bg-white shadow-panel rounded-md px-4 py-3`
- Error: `border-l-4 border-l-status-critical ...`
- Info: `border-l-4 border-l-status-info ...`

Auto-dismiss after 5s with `transition-opacity duration-300`.

---

## 7. Responsive Behavior

| Breakpoint | Tailwind | Behavior |
|------------|----------|----------|
| `< sm` (640px) | default | Single column; sidebar → slide-over drawer; KPI grid 2-col; tables horizontally scroll |
| `sm–lg` | `sm:`, `md:` | KPI grid 2-col; agent heatmap 4-col |
| `≥ lg` (1024px) | `lg:` | Sidebar visible; KPI 4-col; split trace layout; correlation 3-panel |
| `≥ xl` (1280px) | `xl:` | Full correlation 12-col grid; agent heatmap 7-col |

Mobile sidebar drawer:
```
fixed inset-0 z-50 lg:hidden
  overlay: bg-black/40
  panel: absolute left-0 top-0 h-full w-60 bg-db-navy
```

---

## 8. Loading, Empty & Error States

| State | Pattern |
|-------|---------|
| Initial load | Skeleton placeholders matching layout grid — `LoadingSkeleton` with `h-24`, `h-72` variants |
| Filter no results | `<EmptyState icon={MagnifyingGlassIcon} title="No traces match your filters" />` |
| API error | Red alert banner: `rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700` with retry |
| Partial data | Amber info banner when one platform (e.g., New Relic) is unavailable: `bg-amber-50 border-amber-200` |

---

## 9. Accessibility

- All interactive elements: `focus:ring-2 focus:ring-db-red focus:ring-offset-2`
- Status conveyed by icon + text, not color alone (e.g., critical rows include `ExclamationCircleIcon`)
- Tables: `<th scope="col">`, sortable headers with `aria-sort`
- Charts: `aria-label` describing trend direction and current value
- Sidebar: `aria-current="page"` on active link
- Modals/drawers: focus trap, `Escape` to close, `role="dialog"` + `aria-modal="true"`
- Minimum touch target: `min-h-[44px] min-w-[44px]` on mobile interactive elements

---

## 10. Typography Scale

| Use | Classes |
|-----|---------|
| Page title | `text-2xl font-semibold text-db-navy` |
| Section heading | `text-lg font-semibold text-db-gray-800` |
| Card title | `text-sm font-medium text-db-gray-700` |
| Body | `text-sm text-db-gray-600` |
| Caption / meta | `text-xs text-db-gray-400` |
| Monospace IDs | `font-mono text-xs text-db-gray-500` |
| KPI value | `text-3xl font-semibold text-db-navy tabular-nums` |

---

## 11. Iconography

Use **Heroicons v2** (outline for nav, solid for status indicators).

| Context | Icon |
|---------|------|
| Healthy | `CheckCircleIcon` solid, `text-status-healthy` |
| Warning | `ExclamationTriangleIcon` solid, `text-status-warning` |
| Critical | `XCircleIcon` solid, `text-status-critical` |
| External link | `ArrowTopRightOnSquareIcon` |
| Expand/collapse | `ChevronDownIcon` with `transition-transform` |
| Refresh | `ArrowPathIcon` with `animate-spin` while loading |

Icon sizing: nav `h-5 w-5`, inline status `h-4 w-4`, KPI trend `h-3 w-3`.

---

## 12. Presenter Story Flow (internal — not shown in UI)

Aligned with `0 - Setup.ipynb` § Suggested demo flow. Total: **~15 minutes**. Presenter-only; no "demo" labels in the app.

| Act | Duration | Route | Notebook reference |
|-----|----------|-------|-------------------|
| 0 — Set the stage | 2 min | `/` then `/scenarios` | Suggested flow step 1 |
| 1 — Scenario A | 5 min | `/scenarios/a` | Scenario A: Cross-Agent Cascading Failure |
| 2 — Scenario B | 4 min | `/scenarios/b` | Scenario B: Token Budget Exhaustion |
| 3 — Scenario C | 4 min | `/scenarios/c` | Scenario C: Model Drift |
| 4 — Wrap-up | 1 min | `/scenarios` (footer) | Walkthrough summary + Key integration message |

**Prerequisite:** Run `./install.sh` to load UC data before presenting.

### Act 0 — Set the stage (2 min)

1. Open **Unified AI Observability Control Tower** → **Overview** (`/`)
2. Walk **Hub-and-Spoke map**: DE = Hub, 5 regional spokes, NL on AWS
3. Point to agent counts: **28 agents · 6 regions · 3 platforms**
4. Show healthy baseline KPIs (Days 1–4): 95% success, 200–800ms latency
5. Navigate to **Scenarios** (`/scenarios`) — "Three failure modes, each invisible to at least one platform"
6. **Opening line**

### Act 1 — Scenario A: Cross-Agent Cascade (5 min)

Route: `/scenarios/a` — use **Presenter bar** to step through 1–6

| Step | Narration cue | UI focus | Act |
|------|---------------|----------|-----|
| 1 | "IT spoke agent starts failing" | Failed runs timeline | Databricks Detects |
| 2 | "Orchestrator retries — HU and RO rate limited" | Gateway 429/500 bar | Databricks Detects |
| 3 | "New Relic: root cause is Azure OpenAI in IT" | CRITICAL infra alert | New Relic Correlates |
| 4 | "DE orchestrator queue depth explodes" | queue_depth chart | New Relic Correlates |
| 5 | "ServiceNow auto-creates P1 — 450 users" | INC0012010 | ServiceNow Remediates |
| 6 | "Emergency change: circuit breaker" | CHG0005003 | ServiceNow Remediates |

Toggle **Presenter notes** for notebook talking points (§5.7 Scenario A).

### Act 2 — Scenario B: Token Exhaustion (4 min)

Route: `/scenarios/b`

| Step | Narration cue | UI focus |
|------|---------------|----------|
| 1–2 | "Regulatory season — error rate and tokens climbing 3 days" | Trend charts |
| 3 | "Gateway 400s — context overflow at 120K+ tokens" | 400 error table |
| 4 | "User feedback dropping" | Feedback score chart |
| 5 | **"New Relic shows nothing. All green."** | `<InfraEmptyState>` — key pivot moment |
| 6 | "P3 after 4 hours — fix is chunking, not infra" | INC0012002 |

### Act 3 — Scenario C: Model Drift (4 min)

Route: `/scenarios/c`

| Step | Narration cue | UI focus |
|------|---------------|----------|
| 1 | "100% success. Everything looks fine." | Green success banner |
| 2 | "Feedback declining 4.2 → 3.1 over 7 days" | Feedback trend |
| 3 | "Provider silently updated the model" | ModelVersionDiff |
| 4 | "Outputs getting shorter" | Output tokens chart |
| 5 | "Infra: all green again" | InfraHealthGrid |
| 6 | "P3 only after 72-hour SLA breach" | INC0012005 |

### Act 4 — Wrap-up (1 min)

1. Auto-scroll to **Platform visibility matrix** on `/scenarios`
2. Read **Key integration message** (§0.4 blockquote)
3. **Closing line**
4. Optional: `/correlation` for remaining 7 anomalies

---

## 13. File Structure

```
# Data loading (run before customer session)
databricks.yml
resources/demo_data.job.yml
install.sh                          # ./install.sh → deploy + load UC tables

# Unified AI Observability Control Tower (Databricks App)
app.yaml                            # name: unified-ai-observability-control-tower
backend/
├── main.py
├── db.py
├── config.py                       # CATALOG, SCHEMA, scenario time windows
└── queries/
    ├── hero_scenarios.py           # All 18 step queries (3 × 6 steps)
    ├── overview.py
    ├── agents.py
    ├── traces.py
    ├── gateway.py
    ├── tools.py
    ├── incidents.py
    └── correlation.py

src/
├── index.css
├── App.tsx                         # Default route: / (Overview)
├── components/
│   ├── integration/                # Three-platform integration UI (§0.6)
│   ├── scenarios/                  # Scenario walkthrough components
│   ├── layout/
│   ├── charts/
│   ├── tables/
│   └── ui/
├── pages/
│   ├── Overview.tsx                # Control Tower landing
│   ├── Scenarios.tsx               # Scenario index + Act 4 wrap-up
│   ├── ScenarioWalkthrough.tsx     # /scenarios/:id — 6-step walkthrough
│   ├── Agents.tsx
│   ├── Traces.tsx
│   ├── Gateway.tsx
│   ├── Tools.tsx
│   ├── Incidents.tsx
│   └── Correlation.tsx
├── hooks/
│   ├── useFilters.ts
│   ├── useObservabilityData.ts
│   ├── useScenarioProgress.ts      # A → B → C completion tracking
│   └── useScenarioStep.ts          # Fetch step N data from /api/scenarios
└── lib/
    ├── api.ts
    ├── formatters.ts
    ├── types.ts
    └── scenarios.ts                # Hero registry — static metadata from §0.4
```

### `lib/scenarios.ts` shape

Static presenter copy from `0 - Setup.ipynb`; time windows resolved by backend:

```ts
export type HeroId = 'a' | 'b' | 'c';

export interface ScenarioStep {
  step: number;
  platform: 'databricks' | 'newrelic' | 'servicenow';
  title: string;           // from notebook "What to show"
  narration: string;       // presenter script
  presenterNotes: string[]; // notebook talking points
  component: string;       // React component name
  drillDownRoute?: string; // e.g. '/correlation?scenario=a&step=3'
}

export interface HeroScenario {
  id: HeroId;
  notebookScenario: number;  // 10, 2, or 5
  title: string;
  theme: string;
  keyMessage: string;
  regions: string[];
  agents: string[];
  incidentNumber: string;
  changeNumber?: string;
  priority: 'P1' | 'P3';
  durationMin: number;
  dayWindow: { startDay: number; endDay: number; startTime?: string; endTime?: string };
  steps: ScenarioStep[];
  acts?: { label: string; steps: number[] }[];  // Scenario A only
}
```

---

## 14. Dependencies

| Package | Purpose |
|---------|---------|
| `tailwindcss` | Utility-first styling |
| `@tailwindcss/forms` | Form element normalization |
| `@tailwindcss/typography` | Prose blocks for incident descriptions |
| `@heroicons/react` | Icon set |
| `recharts` | Charts |
| `react-router-dom` | Client-side routing |
| `date-fns` | Time range formatting |
| `clsx` + `tailwind-merge` | Conditional class composition via `cn()` helper |

```ts
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
