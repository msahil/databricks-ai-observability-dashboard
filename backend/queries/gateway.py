def summary(prefix: str) -> str:
    return f"""
SELECT
  COUNT(*) AS total_requests,
  ROUND(100.0 * SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_rate,
  SUM(total_tokens) AS total_tokens,
  ROUND(AVG(latency_ms), 0) AS avg_latency_ms,
  COUNT(DISTINCT endpoint_name) AS endpoints
FROM {prefix}.ai_gateway_usage
WHERE event_time >= :start_time AND event_time < :end_time
"""


def recent_requests(prefix: str) -> str:
    return f"""
SELECT g.request_id, g.event_time, g.endpoint_name, g.status_code, g.latency_ms,
       g.input_tokens, g.output_tokens, g.total_tokens,
       CASE WHEN a.transaction_id IS NOT NULL THEN true ELSE false END AS has_nr_apm,
       CASE WHEN i.incident_id IS NOT NULL THEN true ELSE false END AS has_incident
FROM {prefix}.ai_gateway_usage g
LEFT JOIN {prefix}.newrelic_apm_transactions a ON g.request_id = a.linked_gateway_request_id
LEFT JOIN {prefix}.servicenow_incidents i
  ON g.event_time BETWEEN i.opened_at - INTERVAL 2 HOURS AND i.opened_at + INTERVAL 2 HOURS
WHERE g.event_time >= :start_time AND g.event_time < :end_time
ORDER BY g.event_time DESC
LIMIT 100
"""
