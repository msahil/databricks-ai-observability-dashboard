"""FastAPI backend for Unified AI Observability Control Tower."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from databricks.sdk.errors import DatabricksError
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import default_time_range, get_settings, scenario_windows
from backend.db import execute_query, execute_scalar
from backend.queries import correlation, gateway, hero_scenarios, incidents, overview, traces

app = FastAPI(title="Unified AI Observability Control Tower")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DatabricksError)
@app.exception_handler(RuntimeError)
@app.exception_handler(ValueError)
@app.exception_handler(OSError)
def handle_db_errors(_request: Request, exc: Exception) -> JSONResponse:
    """Return actionable JSON errors instead of generic 500 responses."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})

HERO_SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "a",
        "title": "Cross-Agent Cascade",
        "theme": "Detect → Correlate → Remediate",
        "keyMessage": "Single spoke failure → hub retry storm → multi-region cascade. Root cause was Azure infra in IT.",
        "incidentNumber": "INC0012010",
        "changeNumber": "CHG0005003",
        "priority": "P1",
        "durationMin": 5,
        "regions": ["DE", "IT", "HU", "RO"],
        "platformVisibility": {"databricks": True, "newrelic": True, "servicenow": True},
        "acts": [
            {"label": "Databricks Detects (T+0)", "steps": [1, 2]},
            {"label": "New Relic Correlates (T+2)", "steps": [3, 4]},
            {"label": "ServiceNow Remediates (T+5)", "steps": [5, 6]},
        ],
    },
    {
        "id": "b",
        "title": "Token Exhaustion",
        "theme": "Gradual degradation detection",
        "keyMessage": "Invisible to infrastructure monitoring. Only MLflow + Unity AI Gateway catch the 3-day trend.",
        "incidentNumber": "INC0012002",
        "priority": "P3",
        "durationMin": 4,
        "regions": ["IT"],
        "platformVisibility": {"databricks": True, "newrelic": False, "servicenow": True},
    },
    {
        "id": "c",
        "title": "Model Drift",
        "theme": "Silent quality failure",
        "keyMessage": "100% success rate — only quality metrics reveal drift over 7 days.",
        "incidentNumber": "INC0012005",
        "priority": "P3",
        "durationMin": 4,
        "regions": ["SE"],
        "platformVisibility": {"databricks": True, "newrelic": False, "servicenow": True},
    },
]

STEP_META: dict[str, list[dict[str, Any]]] = {
    "a": [
        {"step": 1, "platform": "databricks", "title": "IT agent failures trigger orchestrator retry storm"},
        {"step": 2, "platform": "databricks", "title": "Unity AI Gateway 429s cascading to HU/RO"},
        {"step": 3, "platform": "newrelic", "title": "Azure OpenAI error rate spike — root cause is infra"},
        {"step": 4, "platform": "newrelic", "title": "DE orchestrator queue depth + request rate spike"},
        {"step": 5, "platform": "servicenow", "title": "P1 incident auto-created — 4 regions affected"},
        {"step": 6, "platform": "servicenow", "title": "Emergency change: circuit breaker"},
    ],
    "b": [
        {"step": 1, "platform": "databricks", "title": "Error rate climbing over 3 days"},
        {"step": 2, "platform": "databricks", "title": "Input token volume trending up"},
        {"step": 3, "platform": "databricks", "title": "Gateway 400s — context overflow at 120K+ tokens"},
        {"step": 4, "platform": "databricks", "title": "User feedback score declining"},
        {"step": 5, "platform": "newrelic", "title": "Infrastructure monitoring — no alerts"},
        {"step": 6, "platform": "servicenow", "title": "P3 incident after 4-hour detection lag"},
    ],
    "c": [
        {"step": 1, "platform": "databricks", "title": "100% run success — everything looks fine"},
        {"step": 2, "platform": "databricks", "title": "Feedback declining 4.2 → 3.1 over 7 days"},
        {"step": 3, "platform": "databricks", "title": "Provider silently updated the model"},
        {"step": 4, "platform": "databricks", "title": "Output tokens getting shorter"},
        {"step": 5, "platform": "newrelic", "title": "Infrastructure — all green"},
        {"step": 6, "platform": "servicenow", "title": "P3 after 72-hour SLA breach"},
    ],
}


def _prefix() -> str:
    return get_settings().table_prefix


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _resolve_data_start() -> datetime:
    try:
        raw = execute_scalar(overview.data_start_date(_prefix()))
        if raw is None:
            start, _ = default_time_range(30)
            return start
        if isinstance(raw, datetime):
            return raw
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except Exception:
        start, _ = default_time_range(30)
        return start


def _scenario_window(scenario_id: str) -> dict[str, str]:
    start_date = _resolve_data_start()
    windows = scenario_windows(start_date)
    if scenario_id not in windows:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    w = windows[scenario_id]
    return {"start_time": _iso(w["start"]), "end_time": _iso(w["end"])}


def _time_params(start: str | None, end: str | None) -> dict[str, str]:
    if start and end:
        return {"start_time": start, "end_time": end}
    try:
        prefix = get_settings().table_prefix
        min_raw = execute_scalar(overview.data_start_date(prefix))
        max_raw = execute_scalar(f"SELECT MAX(start_time) AS end_date FROM {prefix}.mlflow_runs")
        if min_raw and max_raw:
            if isinstance(min_raw, datetime):
                data_start = min_raw
            else:
                data_start = datetime.fromisoformat(str(min_raw).replace("Z", "+00:00"))
            if isinstance(max_raw, datetime):
                data_end = max_raw
            else:
                data_end = datetime.fromisoformat(str(max_raw).replace("Z", "+00:00"))
            if data_end <= data_start:
                data_end = data_start + timedelta(days=1)
            return {"start_time": _iso(data_start), "end_time": _iso(data_end)}
    except Exception:
        pass
    s, e = default_time_range(30)
    return {"start_time": _iso(s), "end_time": _iso(e)}


@app.get("/api/health")
def health() -> dict[str, Any]:
    settings = get_settings()
    payload: dict[str, Any] = {
        "status": "ok",
        "catalog": settings.catalog,
        "schema": settings.schema,
        "warehouse_configured": bool(settings.warehouse_id or os.environ.get("DATABRICKS_WAREHOUSE_ID")),
    }
    try:
        payload["agent_count"] = execute_scalar(
            f"SELECT COUNT(*) AS n FROM {settings.table_prefix}.agent_registry"
        )
    except Exception as exc:
        payload["status"] = "degraded"
        payload["db_error"] = str(exc)
    return payload


@app.get("/api/overview/kpis")
def api_kpis(
    start_time: str | None = None,
    end_time: str | None = None,
) -> list[dict[str, Any]]:
    params = _time_params(start_time, end_time)
    rows = execute_query(overview.kpis(_prefix(), "", ""), params)
    return rows


@app.get("/api/overview/platform-health")
def api_platform_health(
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict[str, Any]:
    params = _time_params(start_time, end_time)
    prefix = _prefix()
    queries = overview.platform_health(prefix, "", "")
    result: dict[str, Any] = {}
    for platform, query in queries.items():
        rows = execute_query(query, params)
        result[platform] = rows[0] if rows else {}
    result["correlation_count"] = execute_scalar(
        overview.correlation_count(prefix, "", ""), params
    )
    return result


@app.get("/api/integration/strip")
def api_integration_strip(
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict[str, Any]:
    params = _time_params(start_time, end_time)
    prefix = _prefix()
    result: dict[str, Any] = {}
    for platform, query in overview.integration_strip(prefix, "", "").items():
        rows = execute_query(query, params)
        result[platform] = rows[0] if rows else {}
    return result


@app.get("/api/overview/incidents")
def api_open_incidents() -> list[dict[str, Any]]:
    return execute_query(overview.open_incidents(_prefix()))


@app.get("/api/agents")
def api_agents() -> list[dict[str, Any]]:
    return execute_query(overview.agents(_prefix()))


@app.get("/api/traces")
def api_traces(
    start_time: str | None = None,
    end_time: str | None = None,
) -> list[dict[str, Any]]:
    return execute_query(traces.list_runs(_prefix()), _time_params(start_time, end_time))


@app.get("/api/traces/{run_id}")
def api_trace_detail(run_id: str) -> dict[str, Any]:
    rows = execute_query(traces.run_detail(_prefix()), {"run_id": run_id})
    if not rows:
        raise HTTPException(status_code=404, detail="Run not found")
    return rows[0]


@app.get("/api/gateway/summary")
def api_gateway_summary(
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict[str, Any]:
    rows = execute_query(gateway.summary(_prefix()), _time_params(start_time, end_time))
    return rows[0] if rows else {}


@app.get("/api/gateway/requests")
def api_gateway_requests(
    start_time: str | None = None,
    end_time: str | None = None,
) -> list[dict[str, Any]]:
    return execute_query(gateway.recent_requests(_prefix()), _time_params(start_time, end_time))


@app.get("/api/incidents")
def api_incidents() -> dict[str, Any]:
    prefix = _prefix()
    return {
        "incidents": execute_query(incidents.list_incidents(prefix)),
        "changes": execute_query(incidents.list_changes(prefix)),
    }


@app.get("/api/correlation/timeline")
def api_correlation_timeline(
    start_time: str | None = None,
    end_time: str | None = None,
    platform: str = Query(default="all"),
) -> list[dict[str, Any]]:
    params = _time_params(start_time, end_time)
    params["platform_filter"] = platform
    return execute_query(correlation.unified_timeline(_prefix()), params)


@app.get("/api/scenarios")
def api_scenarios() -> list[dict[str, Any]]:
    return HERO_SCENARIOS


@app.get("/api/scenarios/{scenario_id}")
def api_scenario(scenario_id: str) -> dict[str, Any]:
    meta = next((s for s in HERO_SCENARIOS if s["id"] == scenario_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {**meta, "steps": STEP_META.get(scenario_id, []), "window": _scenario_window(scenario_id)}


@app.get("/api/scenarios/{scenario_id}/window")
def api_scenario_window(scenario_id: str) -> dict[str, str]:
    return _scenario_window(scenario_id)


@app.get("/api/scenarios/{scenario_id}/steps/{step}")
def api_scenario_step(scenario_id: str, step: int) -> dict[str, Any]:
    query = hero_scenarios.step_query(scenario_id, step, _prefix())
    if not query:
        raise HTTPException(status_code=404, detail="Step not found")
    window = _scenario_window(scenario_id)
    params = {"win_start": window["start_time"], "win_end": window["end_time"]}
    data = execute_query(query, params)
    meta = next((s for s in STEP_META.get(scenario_id, []) if s["step"] == step), {})
    return {"step": step, "meta": meta, "data": data, "window": window}


@app.get("/api/scenarios/{scenario_id}/timeline")
def api_scenario_timeline(scenario_id: str) -> list[dict[str, Any]]:
    window = _scenario_window(scenario_id)
    params = {"win_start": window["start_time"], "win_end": window["end_time"]}
    return execute_query(hero_scenarios.cross_platform_timeline(_prefix()), params)


# Static frontend
DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        index = DIST / "index.html"
        if not index.exists():
            raise HTTPException(status_code=404, detail="Frontend not built")
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("DATABRICKS_APP_PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
