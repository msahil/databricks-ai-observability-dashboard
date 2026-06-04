from backend.config import Settings


def kpis(prefix: str, start: str, end: str) -> str:
    return f"""
SELECT
  (SELECT COUNT(*) FROM {prefix}.agent_registry WHERE status = 'active') AS active_agents,
  (SELECT ROUND(100.0 * SUM(CASE WHEN status = 'FINISHED' THEN 1 ELSE 0 END) / COUNT(*), 1)
   FROM {prefix}.mlflow_runs
   WHERE start_time >= :start_time AND start_time < :end_time) AS success_rate,
  (SELECT COUNT(*) FROM {prefix}.servicenow_incidents
   WHERE state NOT IN ('Resolved', 'Closed') AND priority IN ('P1', 'P2')) AS open_incidents,
  (SELECT ROUND(100.0 * SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / COUNT(*), 2)
   FROM {prefix}.ai_gateway_usage
   WHERE event_time >= :start_time AND event_time < :end_time) AS gateway_error_rate
"""


def platform_health(prefix: str, start: str, end: str) -> dict[str, str]:
    return {
        "databricks": f"""
SELECT
  ROUND(100.0 * SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS gateway_error_rate,
  (SELECT COUNT(*) FROM {prefix}.mlflow_runs
   WHERE status = 'FAILED' AND start_time >= :start_time AND start_time < :end_time) AS failed_runs,
  (SELECT COUNT(*) FROM {prefix}.tool_access_logs
   WHERE granted = false AND timestamp >= :start_time AND timestamp < :end_time) AS denied_access
FROM {prefix}.ai_gateway_usage
WHERE event_time >= :start_time AND event_time < :end_time
""",
        "newrelic": f"""
SELECT
  (SELECT SUM(CASE WHEN alert_severity = 'CRITICAL' THEN 1 ELSE 0 END)
   FROM {prefix}.newrelic_infra_metrics
   WHERE timestamp >= :start_time AND timestamp < :end_time) AS critical_alerts,
  (SELECT ROUND(100.0 * SUM(CASE WHEN error THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)
   FROM {prefix}.newrelic_apm_transactions
   WHERE timestamp >= :start_time AND timestamp < :end_time) AS apm_error_rate,
  (SELECT MAX(metric_value) FROM {prefix}.newrelic_infra_metrics
   WHERE metric_name = 'queue_depth' AND timestamp >= :start_time AND timestamp < :end_time) AS max_queue_depth
""",
        "servicenow": f"""
SELECT
  SUM(CASE WHEN priority IN ('P1', 'P2') AND state NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_p1_p2,
  ROUND(AVG(mttr_minutes), 0) AS avg_mttr,
  (SELECT COUNT(*) FROM {prefix}.servicenow_change_requests WHERE state NOT IN ('Closed', 'Cancelled')) AS pending_changes
FROM {prefix}.servicenow_incidents
WHERE opened_at >= :start_time AND opened_at < :end_time
""",
    }


def integration_strip(prefix: str, start: str, end: str) -> dict[str, str]:
    return {
        "databricks": f"""
SELECT
  ROUND(100.0 * SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS gateway_error_pct,
  (SELECT COUNT(*) FROM {prefix}.mlflow_runs WHERE status = 'FAILED'
   AND start_time >= :start_time AND start_time < :end_time) AS failed_runs,
  (SELECT COUNT(*) FROM {prefix}.tool_access_logs WHERE granted = false
   AND timestamp >= :start_time AND timestamp < :end_time) AS denied_access
FROM {prefix}.ai_gateway_usage
WHERE event_time >= :start_time AND event_time < :end_time
""",
        "newrelic": f"""
SELECT
  (SELECT SUM(CASE WHEN alert_severity = 'CRITICAL' THEN 1 ELSE 0 END)
   FROM {prefix}.newrelic_infra_metrics
   WHERE timestamp >= :start_time AND timestamp < :end_time) AS critical_alerts,
  (SELECT ROUND(100.0 * SUM(CASE WHEN error THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)
   FROM {prefix}.newrelic_apm_transactions
   WHERE timestamp >= :start_time AND timestamp < :end_time) AS apm_error_pct,
  (SELECT MAX(metric_value) FROM {prefix}.newrelic_infra_metrics
   WHERE metric_name = 'queue_depth' AND timestamp >= :start_time AND timestamp < :end_time) AS max_queue_depth
""",
        "servicenow": f"""
SELECT
  SUM(CASE WHEN priority IN ('P1', 'P2') AND state NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_incidents,
  ROUND(AVG(mttr_minutes), 0) AS avg_mttr,
  (SELECT COUNT(*) FROM {prefix}.servicenow_change_requests
   WHERE state NOT IN ('Closed', 'Cancelled')) AS pending_changes
FROM {prefix}.servicenow_incidents
""",
    }


def correlation_count(prefix: str, start: str, end: str) -> str:
    return f"""
SELECT COUNT(DISTINCT g.request_id) AS correlated_chains
FROM {prefix}.ai_gateway_usage g
JOIN {prefix}.newrelic_apm_transactions a ON g.request_id = a.linked_gateway_request_id
WHERE g.event_time >= :start_time AND g.event_time < :end_time
"""


def open_incidents(prefix: str) -> str:
    return f"""
SELECT number, priority, short_description, opened_at, mttr_minutes,
       affected_users_count, size(affected_agents) AS agents_impacted, affected_regions
FROM {prefix}.servicenow_incidents
WHERE state NOT IN ('Resolved', 'Closed')
ORDER BY opened_at DESC
LIMIT 5
"""


def agents(prefix: str) -> str:
    return f"""
SELECT agent_id, agent_name, region, cloud_provider, agent_framework, status, owner_team
FROM {prefix}.agent_registry
ORDER BY region, agent_name
"""


def data_start_date(prefix: str) -> str:
    return f"SELECT MIN(start_time) AS start_date FROM {prefix}.mlflow_runs"
