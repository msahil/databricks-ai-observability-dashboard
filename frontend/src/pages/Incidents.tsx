import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, ErrorBanner, LoadingState, PageTitle } from '../components/layout/AppShell';
import { KpiGrid, KpiTile } from '../components/ui/KpiTile';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../lib/api';
import { formatNumber } from '../lib/formatters';

export default function Incidents() {
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [changes, setChanges] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.incidents()
      .then((d) => {
        setIncidents(d.incidents);
        setChanges(d.changes);
      })
      .catch((e) => setError(e.message));
  }, []);

  const border = (p: unknown) =>
    p === 'P1' ? 'border-l-status-critical' : p === 'P2' ? 'border-l-status-warning' : 'border-l-status-info';

  const openCount = incidents.filter((i) => !['Resolved', 'Closed'].includes(String(i.state))).length;
  const p1Count = incidents.filter((i) => i.priority === 'P1').length;
  const avgMttr =
    incidents.length > 0
      ? incidents.reduce((sum, i) => sum + Number(i.mttr_minutes ?? 0), 0) / incidents.length
      : 0;

  return (
    <AppShell>
      <PageTitle
        title="Incidents"
        subtitle="ServiceNow — automated response linked to Databricks and New Relic signals"
      />
      {error && <ErrorBanner message={error} />}

      {!incidents.length ? (
        <LoadingState />
      ) : (
        <>
          <section className="section">
            <SectionHeader eyebrow="ServiceNow" title="Incident KPIs" compact />
            <KpiGrid cols={3}>
              <KpiTile
                label="Open Incidents"
                value={String(openCount)}
                status={openCount > 0 ? 'bad' : 'ok'}
                accent="servicenow"
              />
              <KpiTile
                label="P1 Critical"
                value={String(p1Count)}
                status={p1Count > 0 ? 'bad' : 'ok'}
                accent="servicenow"
              />
              <KpiTile
                label="Avg MTTR"
                value={`${formatNumber(avgMttr, 0)} min`}
                accent="servicenow"
              />
            </KpiGrid>
          </section>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div key={String(inc.incident_id)} className={`card border-l-4 p-4 ${border(inc.priority)}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold">{String(inc.number)}</span>
                  <span className={inc.priority === 'P1' ? 'badge-critical' : 'badge-warning'}>
                    {String(inc.priority)}
                  </span>
                  <span className="badge-healthy">{String(inc.state)}</span>
                  <span className="text-sm text-db-gray-400">{String(inc.source_system)}</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-db-navy">{String(inc.short_description)}</h3>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm text-db-gray-500">
                  <div>Opened: {String(inc.opened_at)}</div>
                  <div>MTTR: {String(inc.mttr_minutes)} min</div>
                  <div>Users: {String(inc.affected_users_count)}</div>
                  <div>Category: {String(inc.category)}</div>
                </div>
                <Link to="/correlation" className="btn-secondary mt-3 inline-block">
                  Open Correlation View
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {changes.length > 0 && (
        <section className="section mt-4">
          <h3 className="mb-2 text-base font-bold text-db-navy">Change requests</h3>
          <div className="card overflow-x-auto">
            <table className="table-compact w-full">
              <thead>
                <tr className="border-b text-sm font-semibold uppercase tracking-wide text-db-gray-500">
                  <th>Change</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Risk</th>
                  <th>Parent</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => (
                  <tr key={String(c.change_id)} className="border-b">
                    <td className="font-mono">{String(c.number)}</td>
                    <td>{String(c.type)}</td>
                    <td>{String(c.state)}</td>
                    <td>{String(c.risk)}</td>
                    <td>{String(c.parent_incident_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}
