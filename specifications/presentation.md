# Unified AI Agent Observability & Security — Presentation Outline

> **Purpose:** Slide-generation input for the Unified AI Observability Control Tower demo.
> **Source of truth:** `specifications/user-interface.md` (UI spec) + `setup/0 - Setup.ipynb` (data/scenarios).
> **Audience:** Platform engineering, SRE, AI platform owners, and executive sponsors (CXO/CISO).
> **Runtime:** ~20 min (15 min app walkthrough + 5 min framing & Lakewatch capstone).
> **Format note:** Each `---` is one slide. `Notes:` = speaker notes. Replace bracketed `[…]` with live values from the running app.

---

## Slide 1 — Title

**Unified AI Agent Observability & Security**
One control tower across AI traces, Unity AI Gateway, infrastructure, and ITSM — on one lakehouse.

- Databricks · New Relic · ServiceNow
- 28 agents · 6 regions · hub-and-spoke AI platform

Notes: Open warm. This is about seeing — and securing — AI agents in production at enterprise scale. Set expectation: three real failure modes, each invisible to at least one tool alone.

---

## Slide 2 — The shift: AI agents are now production infrastructure

- Enterprises run **fleets** of agents across regions, clouds, and frameworks.
- Each agent spans four layers: **AI logic → gateway/routing → infrastructure → business/ITSM impact**.
- A failure in one layer cascades into the others — but each team watches only its own tool.

Notes: The problem isn't a lack of monitoring. It's that monitoring is *siloed by vendor*. The agent estate crosses all of them.

---

## Slide 3 — The core problem: blind spots between platforms

Three questions, three different owners, no shared view:

| Platform | Role | Question it answers |
|----------|------|---------------------|
| **Databricks** | AI-native observability | What failed in the AI estate, why, and what's the governance impact? |
| **New Relic** | Infrastructure correlation | Is this an AI problem or an infrastructure problem? |
| **ServiceNow** | Automated response | Who's responsible, what's the SLA impact, what's the fix? |

Notes: Each platform is excellent at its job. The value is the *interplay* — and that's exactly where blind spots live.

---

## Slide 4 — The solution: Unified AI Observability Control Tower

A single pane of glass that correlates signals across all three platforms.

- **Guided walkthroughs** — three hero scenarios (A → B → C, ~15 min)
- **Exploration** — agents, traces, gateway, incidents, correlation
- Built as a **Databricks App** on **Unity Catalog** — all data live, no mock data

Notes: Emphasize: this runs *on* Databricks, querying governed UC tables. The integration story is native, not bolted on.

---

## Slide 5 — The correlation chain (the heart of the product)

```
MLflow run  →  AI Gateway request  →  New Relic APM  →  ServiceNow incident
```

Plus: tool access logs (governance) · infra metrics (New Relic) · agent registry (blast radius).

Notes: This is the muscle to demonstrate. Everything downstream — and the Lakewatch security story — reuses this same chain. Say it out loud: "one join path, end to end."

---

## Slide 6 — Customer context: hub-and-spoke AI platform

- **DE = Hub** (Central IT / AI Platform); spokes: **IT, SE, HU, RO, NL**
- **28 agents · 6 regions · 3 observability platforms**
- Frameworks: AgentBricks, Azure AI Agent Service, Amazon Bedrock Agents (NL on AWS)
- Healthy baseline (Days 1–4): ~95% success · 200–800 ms latency · feedback 3.8–4.5

Notes: Ground the audience in a realistic estate before breaking it. Point to the hub-and-spoke map on the Overview page.

---

## Slide 7 — The app at a glance

| Page | What it shows |
|------|---------------|
| **Overview** | Live platform signals, fleet KPIs, correlation chain, scenario launch |
| **Scenarios** | Three guided walkthroughs + platform visibility matrix |
| **Agents / Traces** | 28-agent registry; MLflow run explorer |
| **Unity AI Gateway** | Requests, error rate, tokens, latency + correlation links |
| **Tool Access** | Unity Catalog governance — MCP tools, denied access |
| **Incidents** | ServiceNow incidents + change requests |
| **Correlation** | Unified cross-platform timeline |

Notes: Quick orientation. You'll spend most time in Scenarios; the rest supports free-form Q&A.

---

## Slide 8 — Demo framing (opening line)

> "Let me show you three very different failure modes — each one invisible to at least one of these platforms alone."

Notes: Say this verbatim before launching Scenario A. It sets the through-line for all three scenarios.

---

## Slide 9 — Scenario A: Cross-Agent Cascade (the full stack working)

- **Theme:** Detect → Correlate → Remediate · **Regions:** DE → IT → HU → RO
- **Story:** IT spoke fails → hub retry storm → multi-region cascade. **Root cause = Azure infra in IT, not agent logic.**
- **Detection:** Databricks ✓ (retry storm) · New Relic ✓ (root cause) · ServiceNow ✓ (P1 + emergency change)
- **Outcome:** `INC0012010` (P1, 450 users, 30-min MTTR) · `CHG0005003` (circuit breaker)

Notes: This is the "everything works together" scenario. The punchline: without New Relic it looks like an agent bug; the real cause was infrastructure.

---

## Slide 10 — Scenario B: Token Exhaustion (AI-native detection)

- **Theme:** Gradual degradation · **Region:** IT · **Agent:** IT-Customer-Support-Agent
- **Story:** Error rate + input tokens climb over 3 days; Gateway 400s at 120K+ tokens; feedback drops.
- **Detection:** Databricks ✓ · **New Relic ✗ (shows nothing — all green)** · ServiceNow ✓ (P3, 4h lag)
- **Pivot moment:** "New Relic shows nothing. All green." — fix is config (chunking), not infra.
- **Outcome:** `INC0012002` (P3)

Notes: Step 5 is the money shot — infra empty state. Only AI-layer observability caught the trend. Wrong team would've been paged otherwise.

---

## Slide 11 — Scenario C: Model Drift (silent quality failure)

- **Theme:** No errors, no alerts, just declining quality — the hardest problem
- **Region:** SE · **Agent:** SE-Energy-Forecast-Agent
- **Story:** 100% FINISHED runs, 200s, zero infra alerts. Only **feedback_score ↓ (4.2→3.1)** + output tokens ↓ + Gateway model-version change reveal drift.
- **Forensic clue:** `gpt-4o-2025-05-13` → `gpt-4o-2025-06-01` (silent provider update)
- **Detection:** Databricks ✓ · New Relic ✗ · ServiceNow ✓ (P3, 72h SLA breach) · **Outcome:** `INC0012005`

Notes: The nightmare scenario — traditional monitoring sees a perfectly healthy system. Quality-loop observability is the only signal.

---

## Slide 12 — Platform visibility matrix (wrap-up)

| Detection pattern | Scenario A | Scenario B | Scenario C |
|-------------------|:----------:|:----------:|:----------:|
| Databricks AI signal | ✓ Retry storm | ✓ Token trend | ✓ Quality metrics |
| New Relic infra signal | ✓ Root cause | ✗ Nothing | ✗ Nothing |
| ServiceNow action | ✓ P1 + CHG | ✓ P3 fix | ✓ P3 pin |
| Blind spot without integration | Infra cause hidden | 3-day blind spot | Weeks undetected |

Notes: This single slide is the proof. Each scenario has at least one ✗ — that's the gap unified observability closes.

---

## Slide 13 — Key integration message (closing line)

> Databricks owns the **AI-native signal** (traces, cost, quality, governance).
> New Relic owns the **infrastructure signal** (APM, network, compute health).
> ServiceNow owns the **action** (incidents, remediation, compliance).
> The integrated stack eliminates blind spots that exist when any platform operates alone.

> "Without unified AI observability, Scenario A looks like an agent bug, Scenario B goes undetected for days, and Scenario C goes undetected for weeks."

Notes: Deliver both blockquotes. This is the emotional and logical close of the observability story — then transition to security.

---

## Slide 14 — Capstone: from observability to security (Lakewatch)

**Two pillars, one lakehouse:**

| Pillar | Question | Product |
|--------|----------|---------|
| **Observe** | Is my agent healthy — failing, degrading, drifting? | MLflow · AI Gateway · Lakehouse Monitoring |
| **Secure** | Is my agent compromised, misused, or weaponized? | **Lakewatch** (agentic SIEM) |
| **Shared foundation** | — | Unity Catalog · Genie · MLflow · OCSF · open formats |

> "Same lakehouse. Same Unity Catalog. Same correlation model you just watched. Lakewatch points it at a different question — security."

Notes: Lakewatch is **Private Preview** — present as direction, not GA. Keep pillars distinct: Lakewatch is a SIEM, not an MLflow-style observability tool. Bridge via the denied tool-access signal you showed on the Tool Access page. (Full talk track: UI spec §12.1.)

---

## Slide 15 — Why Databricks: one platform, no silos

- **Unity Catalog** governs every signal — observability *and* security — in one place.
- The **correlation chain** is reusable across health and threat detection.
- **Genie** for natural-language investigation; **MLflow** for custom detections.
- Open formats (Delta/Iceberg, OCSF) — own your data, no vendor lock-in.

Notes: Land the strategic point: the lakehouse is the unifying substrate. Competitors bolt AI onto a SIEM; Databricks runs both natively on governed data.

---

## Slide 16 — Call to action / next steps

- **Try it:** deploy the Control Tower in your workspace (`./install.sh`).
- **Phase 2 idea:** reframe Tool Access + Correlation as the agent-security bridge.
- **Lakewatch:** request the Private Preview conversation if security is a priority.
- **Explore:** all 28 agents and 7 additional anomalies via Correlation.

Notes: Tailor CTA to the room — engineers want the deploy; execs want the unified-platform vision and the Lakewatch direction.

---

## Appendix A — Architecture

- **Frontend:** React · Tailwind · Recharts · React Router
- **Backend:** FastAPI · Databricks SQL Connector
- **Data:** Unity Catalog `msahil.ai_observability` — 12 Delta tables
- **Deploy:** Declarative Automation Bundle (data job + Control Tower app)

---

## Appendix B — Data model (12 UC tables)

- **Databricks:** agent_registry · mlflow_experiments · mlflow_runs · mlflow_run_metrics · ai_gateway_usage · tool_access_logs · mcp_catalog · user_profiles
- **New Relic:** newrelic_infra_metrics · newrelic_apm_transactions
- **ServiceNow:** servicenow_incidents · servicenow_change_requests

Correlation path: `mlflow_runs.run_id → ai_gateway_usage → newrelic_apm_transactions → servicenow_incidents` (+ tool_access_logs, agent_registry, user_profiles for blast radius).

---

## Appendix C — Hero scenario quick reference

| Hero | Theme | Region(s) | Incident | Visibility |
|------|-------|-----------|----------|------------|
| A — Cross-Agent Cascade | Detect → Correlate → Remediate | DE, IT, HU, RO | INC0012010 (P1) | DB ✓ · NR ✓ · SN ✓ |
| B — Token Exhaustion | Gradual AI-layer degradation | IT | INC0012002 (P3) | DB ✓ · NR ✗ · SN ✓ |
| C — Model Drift | Silent quality failure | SE | INC0012005 (P3) | DB ✓ · NR ✗ · SN ✓ |

---

## Design hints for the slide generator

- **Brand:** Databricks — deep navy (`#0B1B2B`-ish) + Databricks red (`#FF3621`) accents; clean, enterprise, high information density.
- **Platform colors:** Databricks red, New Relic green, ServiceNow teal — use consistently in matrices and badges.
- **Visual motif:** the 4-node correlation chain (MLflow → Gateway → New Relic → ServiceNow) as a recurring horizontal flow graphic.
- **Checkmark/cross matrices** (Slides 12, App C) should be visually bold — they carry the core argument.
- **One idea per slide;** push detail into speaker notes.
