from backend.config import Settings


def step_query(scenario_id: str, step: int, prefix: str) -> str | None:
    queries: dict[str, dict[int, str]] = {
        "a": {
            1: f"""
SELECT run_id, run_name, status, start_time, params['agent_id'] AS agent_id, params['region'] AS region
FROM {prefix}.mlflow_runs
WHERE status = 'FAILED' AND start_time BETWEEN :win_start AND :win_end
ORDER BY start_time
LIMIT 100
""",
            2: f"""
SELECT status_code, COUNT(*) AS cnt
FROM {prefix}.ai_gateway_usage
WHERE status_code IN (429, 500, 504) AND event_time BETWEEN :win_start AND :win_end
GROUP BY status_code ORDER BY status_code
""",
            3: f"""
SELECT entity_name, metric_name, metric_value, alert_severity, timestamp
FROM {prefix}.newrelic_infra_metrics
WHERE entity_name = 'it-azure-openai-instance' AND alert_severity = 'CRITICAL'
  AND timestamp BETWEEN :win_start AND :win_end
ORDER BY timestamp
LIMIT 50
""",
            4: f"""
SELECT timestamp, metric_name, metric_value
FROM {prefix}.newrelic_infra_metrics
WHERE entity_name = 'de-orchestrator-serving'
  AND metric_name IN ('queue_depth', 'request_rate_per_sec')
  AND timestamp BETWEEN :win_start AND :win_end
ORDER BY timestamp
""",
            5: f"SELECT * FROM {prefix}.servicenow_incidents WHERE number = 'INC0012010'",
            6: f"SELECT * FROM {prefix}.servicenow_change_requests WHERE number = 'CHG0005003'",
        },
        "b": {
            1: f"""
SELECT DATE(start_time) AS day,
  ROUND(100.0 * SUM(CASE WHEN status != 'FINISHED' THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_rate
FROM {prefix}.mlflow_runs
WHERE start_time BETWEEN :win_start AND :win_end
GROUP BY DATE(start_time) ORDER BY day
""",
            2: f"""
SELECT DATE(metric_time) AS day, AVG(metric_value) AS avg_input_tokens
FROM {prefix}.mlflow_run_metrics
WHERE metric_name = 'input_tokens' AND metric_time BETWEEN :win_start AND :win_end
GROUP BY DATE(metric_time) ORDER BY day
""",
            3: f"""
SELECT request_id, event_time, input_tokens, status_code, endpoint_name
FROM {prefix}.ai_gateway_usage
WHERE status_code = 400 AND endpoint_name = 'it-customer-agent-endpoint'
  AND event_time BETWEEN :win_start AND :win_end
ORDER BY input_tokens DESC LIMIT 20
""",
            4: f"""
SELECT DATE(metric_time) AS day, AVG(metric_value) AS avg_feedback
FROM {prefix}.mlflow_run_metrics
WHERE metric_name = 'feedback_score' AND metric_time BETWEEN :win_start AND :win_end
GROUP BY DATE(metric_time) ORDER BY day
""",
            5: f"""
SELECT COUNT(*) AS alert_count
FROM {prefix}.newrelic_infra_metrics
WHERE alert_severity IN ('WARNING', 'CRITICAL')
  AND timestamp BETWEEN :win_start AND :win_end
""",
            6: f"SELECT * FROM {prefix}.servicenow_incidents WHERE number = 'INC0012002'",
        },
        "c": {
            1: f"""
SELECT ROUND(100.0 * SUM(CASE WHEN status = 'FINISHED' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM {prefix}.mlflow_runs
WHERE start_time BETWEEN :win_start AND :win_end
""",
            2: f"""
SELECT DATE(metric_time) AS day, AVG(metric_value) AS avg_feedback
FROM {prefix}.mlflow_run_metrics
WHERE metric_name = 'feedback_score' AND metric_time BETWEEN :win_start AND :win_end
GROUP BY DATE(metric_time) ORDER BY day
""",
            3: f"""
SELECT run_id, params['model_name'] AS model_name, params['model_version'] AS model_version, start_time
FROM {prefix}.mlflow_runs
WHERE params['agent_id'] IN (
  SELECT agent_id FROM {prefix}.agent_registry WHERE agent_name = 'SE-Energy-Forecast-Agent'
) AND start_time BETWEEN :win_start AND :win_end
ORDER BY start_time DESC LIMIT 20
""",
            4: f"""
SELECT DATE(metric_time) AS day, AVG(metric_value) AS avg_output_tokens
FROM {prefix}.mlflow_run_metrics m
JOIN {prefix}.mlflow_runs r ON m.run_id = r.run_id
WHERE metric_name = 'output_tokens'
  AND r.params['agent_id'] IN (
    SELECT agent_id FROM {prefix}.agent_registry WHERE agent_name = 'SE-Energy-Forecast-Agent'
  ) AND metric_time BETWEEN :win_start AND :win_end
GROUP BY DATE(metric_time) ORDER BY day
""",
            5: f"""
SELECT entity_name, metric_name, AVG(metric_value) AS avg_value, MAX(alert_severity) AS max_severity
FROM {prefix}.newrelic_infra_metrics
WHERE entity_name LIKE 'se-%' AND timestamp BETWEEN :win_start AND :win_end
GROUP BY entity_name, metric_name
ORDER BY entity_name, metric_name
""",
            6: f"SELECT * FROM {prefix}.servicenow_incidents WHERE number = 'INC0012005'",
        },
    }
    return queries.get(scenario_id, {}).get(step)


def cross_platform_timeline(prefix: str) -> str:
    return f"""
SELECT 'mlflow' AS platform, run_id AS event_id, start_time AS event_time,
       CONCAT('Run ', run_name, ' — ', status) AS summary, 'databricks' AS platform_group
FROM {prefix}.mlflow_runs
WHERE start_time BETWEEN :win_start AND :win_end AND status != 'FINISHED'
UNION ALL
SELECT 'gateway' AS platform, request_id, event_time,
       CONCAT('Gateway ', CAST(status_code AS STRING), ' — ', endpoint_name), 'databricks'
FROM {prefix}.ai_gateway_usage
WHERE event_time BETWEEN :win_start AND :win_end AND status_code >= 400
UNION ALL
SELECT 'newrelic' AS platform, metric_id, timestamp,
       CONCAT(entity_name, ' — ', metric_name, ' ', CAST(ROUND(metric_value,1) AS STRING)), 'newrelic'
FROM {prefix}.newrelic_infra_metrics
WHERE timestamp BETWEEN :win_start AND :win_end AND alert_severity IN ('WARNING', 'CRITICAL')
UNION ALL
SELECT 'servicenow' AS platform, incident_id, opened_at,
       CONCAT(number, ' — ', short_description), 'servicenow'
FROM {prefix}.servicenow_incidents
WHERE opened_at BETWEEN :win_start AND :win_end
ORDER BY event_time
LIMIT 200
"""
