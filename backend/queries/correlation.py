def unified_timeline(prefix: str) -> str:
    return f"""
SELECT 'mlflow' AS source, run_id AS id, start_time AS ts,
       CONCAT(run_name, ' — ', status) AS label, 'databricks' AS platform
FROM {prefix}.mlflow_runs
WHERE start_time >= :start_time AND start_time < :end_time
  AND (:platform_filter = 'all' OR :platform_filter = 'databricks')
UNION ALL
SELECT 'gateway', request_id, event_time,
       CONCAT(endpoint_name, ' ', CAST(status_code AS STRING)), 'databricks'
FROM {prefix}.ai_gateway_usage
WHERE event_time >= :start_time AND event_time < :end_time
  AND (:platform_filter = 'all' OR :platform_filter = 'databricks')
UNION ALL
SELECT 'apm', transaction_id, timestamp,
       CONCAT(service_name, ' — ', transaction_name), 'newrelic'
FROM {prefix}.newrelic_apm_transactions
WHERE timestamp >= :start_time AND timestamp < :end_time
  AND (:platform_filter = 'all' OR :platform_filter = 'newrelic')
UNION ALL
SELECT 'infra', metric_id, timestamp,
       CONCAT(entity_name, ' — ', metric_name), 'newrelic'
FROM {prefix}.newrelic_infra_metrics
WHERE timestamp >= :start_time AND timestamp < :end_time
  AND alert_severity IN ('WARNING', 'CRITICAL')
  AND (:platform_filter = 'all' OR :platform_filter = 'newrelic')
UNION ALL
SELECT 'incident', incident_id, opened_at,
       CONCAT(number, ' — ', short_description), 'servicenow'
FROM {prefix}.servicenow_incidents
WHERE opened_at >= :start_time AND opened_at < :end_time
  AND (:platform_filter = 'all' OR :platform_filter = 'servicenow')
ORDER BY ts DESC
LIMIT 300
"""
