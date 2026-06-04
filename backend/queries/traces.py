def list_runs(prefix: str) -> str:
    return f"""
SELECT run_id, run_name, experiment_id, status, start_time, end_time, created_by,
       params['agent_id'] AS agent_id, params['region'] AS region,
       aggregated_metrics['latency_ms'] AS latency_ms,
       aggregated_metrics['total_cost_usd'] AS total_cost_usd,
       aggregated_metrics['feedback_score'] AS feedback_score
FROM {prefix}.mlflow_runs
WHERE start_time >= :start_time AND start_time < :end_time
ORDER BY start_time DESC
LIMIT 200
"""


def run_detail(prefix: str) -> str:
    return f"""
SELECT r.*, e.name AS experiment_name
FROM {prefix}.mlflow_runs r
LEFT JOIN {prefix}.mlflow_experiments e ON r.experiment_id = e.experiment_id
WHERE r.run_id = :run_id
"""
