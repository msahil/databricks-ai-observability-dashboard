def list_incidents(prefix: str) -> str:
    return f"""
SELECT incident_id, number, priority, state, short_description, description,
       opened_at, mttr_minutes, affected_users_count, affected_agents, affected_regions,
       category, subcategory, assignment_group, source_system
FROM {prefix}.servicenow_incidents
ORDER BY opened_at DESC
"""


def list_changes(prefix: str) -> str:
    return f"""
SELECT change_id, number, type, state, risk, parent_incident_id,
       planned_start, planned_end, assignment_group, short_description
FROM {prefix}.servicenow_change_requests
ORDER BY planned_start DESC
"""
