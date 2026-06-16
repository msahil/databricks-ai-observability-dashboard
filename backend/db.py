import json
import os
import subprocess
import threading
import time
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementParameterListItem, StatementState

from backend.config import Settings, get_settings

# Cached CLI OAuth tokens (profile -> (access_token, expiry_epoch)).
# A lock prevents concurrent `databricks auth token` calls, which can race on
# keychain/secure storage and fail with CLI exit status 45.
_profile_token_cache: dict[str, tuple[str, float]] = {}
_token_lock = threading.Lock()

_workspace_client: WorkspaceClient | None = None
_workspace_client_lock = threading.Lock()


def _profile_host(profile: str) -> str | None:
    """Read host from ~/.databrickscfg without initializing SDK OAuth."""
    path = os.path.expanduser("~/.databrickscfg")
    if not os.path.isfile(path):
        return None
    in_section = False
    with open(path, encoding="utf-8") as cfg:
        for raw_line in cfg:
            line = raw_line.strip()
            if line == f"[{profile}]":
                in_section = True
                continue
            if in_section and line.startswith("[") and line.endswith("]"):
                break
            if in_section and line.startswith("host"):
                _, _, value = line.partition("=")
                return value.strip()
    return None


def _resolve_host(settings: Settings, profile: str | None) -> str | None:
    if settings.host:
        return settings.host
    env_host = os.environ.get("DATABRICKS_HOST")
    if env_host:
        return env_host
    if profile:
        return _profile_host(profile)
    return None


def _parse_token_expiry(payload: dict[str, Any]) -> float:
    expiry = payload.get("expiry")
    if expiry:
        return datetime.fromisoformat(expiry).timestamp()
    return time.time() + float(payload.get("expires_in", 3600))


def _cli_access_token(profile: str) -> str:
    """Fetch OAuth token via CLI with process-wide lock and in-memory cache."""
    with _token_lock:
        cached = _profile_token_cache.get(profile)
        if cached and cached[1] > time.time() + 120:
            return cached[0]

        result = subprocess.run(
            ["databricks", "auth", "token", "--profile", profile],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            stderr = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(
                f"databricks auth token failed (exit {result.returncode}): {stderr}. "
                f"Try: databricks auth login --profile {profile}"
            )

        payload = json.loads(result.stdout)
        token = payload["access_token"]
        expiry_ts = _parse_token_expiry(payload)
        _profile_token_cache[profile] = (token, expiry_ts)
        return token


def _clear_token_cache(profile: str | None) -> None:
    global _workspace_client
    with _token_lock:
        if profile:
            _profile_token_cache.pop(profile, None)
    with _workspace_client_lock:
        _workspace_client = None


def _pat_client(host: str, token: str) -> WorkspaceClient:
    # auth_type=pat treats the token as static; OAuth JWTs must not use CLI refresh.
    return WorkspaceClient(host=host, token=token, auth_type="pat", profile=None)


def _client(settings: Settings | None = None) -> WorkspaceClient:
    global _workspace_client
    settings = settings or get_settings()
    profile = os.environ.get("DATABRICKS_CONFIG_PROFILE")
    host = _resolve_host(settings, profile)
    env_token = os.environ.get("DATABRICKS_TOKEN")

    if env_token and host:
        return _pat_client(host, env_token)

    if profile and host:
        with _workspace_client_lock:
            cached = _profile_token_cache.get(profile)
            if (
                _workspace_client is not None
                and cached
                and cached[1] > time.time() + 120
            ):
                return _workspace_client

            token = _cli_access_token(profile)
            _workspace_client = _pat_client(host, token)
            return _workspace_client

    if settings.host:
        return WorkspaceClient(host=settings.host, profile=profile)
    if profile:
        return WorkspaceClient(profile=profile)
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


def _is_auth_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "access token",
            "unauthorized",
            "authentication",
            "invalid token",
            "token refresh",
            "exit status 45",
        )
    )


def execute_query(
    query: str,
    params: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    profile = os.environ.get("DATABRICKS_CONFIG_PROFILE")
    try:
        return _execute_query(query, params, settings)
    except Exception as exc:
        if profile and _is_auth_error(exc):
            _clear_token_cache(profile)
            return _execute_query(query, params, settings)
        raise


def _execute_query(
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
