import os
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementParameterListItem, StatementState

from backend.config import Settings, get_settings


def _client(settings: Settings | None = None) -> WorkspaceClient:
    settings = settings or get_settings()
    if settings.host:
        return WorkspaceClient(host=settings.host)
    return WorkspaceClient()


def _warehouse_id(settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    wh = settings.warehouse_id or os.environ.get("DATABRICKS_WAREHOUSE_ID", "")
    if not wh:
        raise RuntimeError("DATABRICKS_WAREHOUSE_ID is not configured")
    return wh


def _normalize(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _parameters(params: dict[str, Any] | None) -> list[StatementParameterListItem] | None:
    if not params:
        return None
    return [StatementParameterListItem(name=key, value=str(value)) for key, value in params.items()]


def execute_query(
    query: str,
    params: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    w = _client(settings)
    resp = w.statement_execution.execute_statement(
        warehouse_id=_warehouse_id(settings),
        statement=query,
        parameters=_parameters(params),
        wait_timeout="50s",
    )
    state = resp.status.state if resp.status else None
    if state != StatementState.SUCCEEDED:
        message = resp.status.error.message if resp.status and resp.status.error else str(state)
        raise RuntimeError(message)

    if not resp.manifest or not resp.manifest.schema or not resp.manifest.schema.columns:
        return []

    columns = [col.name for col in resp.manifest.schema.columns]
    data = resp.result.data_array if resp.result and resp.result.data_array else []
    return [
        {columns[i]: _normalize(row[i]) for i in range(len(columns))}
        for row in data
    ]


def execute_scalar(
    query: str,
    params: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> Any:
    rows = execute_query(query, params, settings)
    if not rows:
        return None
    return next(iter(rows[0].values()))
