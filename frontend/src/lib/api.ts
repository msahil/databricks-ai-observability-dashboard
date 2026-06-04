const BASE = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => fetchJson<{ status: string }>('/health'),
  kpis: () => fetchJson<Record<string, number>[]>('/overview/kpis'),
  platformHealth: () => fetchJson<Record<string, unknown>>('/overview/platform-health'),
  integrationStrip: () => fetchJson<Record<string, Record<string, number>>>('/integration/strip'),
  openIncidents: () => fetchJson<Record<string, unknown>[]>('/overview/incidents'),
  agents: () => fetchJson<Record<string, unknown>[]>('/agents'),
  traces: () => fetchJson<Record<string, unknown>[]>('/traces'),
  gatewaySummary: () => fetchJson<Record<string, number>>('/gateway/summary'),
  gatewayRequests: () => fetchJson<Record<string, unknown>[]>('/gateway/requests'),
  incidents: () => fetchJson<{ incidents: Record<string, unknown>[]; changes: Record<string, unknown>[] }>('/incidents'),
  correlationTimeline: (platform = 'all') =>
    fetchJson<Record<string, unknown>[]>(`/correlation/timeline?platform=${platform}`),
  scenarios: () => fetchJson<import('./types').HeroScenario[]>('/scenarios'),
  scenario: (id: string) => fetchJson<Record<string, unknown>>(`/scenarios/${id}`),
  scenarioStep: (id: string, step: number) =>
    fetchJson<{ data: Record<string, unknown>[]; meta: Record<string, unknown>; window: Record<string, string> }>(
      `/scenarios/${id}/steps/${step}`,
    ),
  scenarioTimeline: (id: string) => fetchJson<Record<string, unknown>[]>(`/scenarios/${id}/timeline`),
};
