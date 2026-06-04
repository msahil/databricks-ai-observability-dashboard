import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, ErrorBanner, LoadingState, PageTitle } from '../components/layout/AppShell';
import { SignalFlowDiagram } from '../components/integration/SignalFlowDiagram';
import { KpiGrid, KpiTile } from '../components/ui/KpiTile';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../lib/api';
import { formatNumber, formatPct } from '../lib/formatters';
import { CheckCircleIcon, LinkIcon } from '@heroicons/react/24/solid';

export default function Gateway() {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.gatewaySummary(), api.gatewayRequests()])
      .then(([s, r]) => {
        setSummary(s);
        setRequests(r);
      })
      .catch((e) => setError(e.message));
  }, []);

  const errorRate = Number(summary?.error_rate ?? 0);

  return (
    <AppShell>
      <PageTitle
        title="Unity AI Gateway"
        subtitle="Correlated with New Relic APM and ServiceNow incidents"
      />
      {error && <ErrorBanner message={error} />}
      <div className="mb-4 rounded-lg border border-platform-databricks/20 bg-gradient-to-r from-red-50/60 to-white px-4 py-3 text-sm text-db-gray-700">
        Every gateway request traces to an MLflow run, a New Relic APM transaction, and a ServiceNow
        incident via the correlation chain.
      </div>

      {!summary ? (
        <LoadingState />
      ) : (
        <section className="section">
          <SectionHeader eyebrow="Performance" title="Gateway KPIs" compact />
          <KpiGrid cols={5}>
            <KpiTile
              label="Total Requests"
              value={summary.total_requests?.toLocaleString() ?? '—'}
              accent="databricks"
              hint="Last 30 days"
            />
            <KpiTile
              label="Error Rate"
              value={formatPct(summary.error_rate)}
              status={errorRate > 5 ? 'bad' : errorRate > 2 ? 'warn' : 'ok'}
              accent="databricks"
            />
            <KpiTile
              label="Total Tokens"
              value={summary.total_tokens?.toLocaleString() ?? '—'}
              accent="databricks"
            />
            <KpiTile
              label="Avg Latency"
              value={`${formatNumber(summary.avg_latency_ms, 0)} ms`}
              accent="databricks"
            />
            <KpiTile
              label="Active Endpoints"
              value={String(summary.endpoints ?? '—')}
              accent="databricks"
            />
          </KpiGrid>
        </section>
      )}

      <SignalFlowDiagram />

      <section className="section">
        <div className="card overflow-x-auto">
        <table className="table-compact w-full">
          <thead>
            <tr className="border-b text-sm font-semibold uppercase tracking-wide text-db-gray-500">
              <th>Time</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Tokens</th>
              <th>Correlated</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={String(r.request_id)} className="border-b border-db-gray-100">
                <td className="font-mono text-sm">{String(r.event_time)}</td>
                <td>{String(r.endpoint_name)}</td>
                <td>
                  <span className={Number(r.status_code) >= 400 ? 'badge-critical' : 'badge-healthy'}>
                    {String(r.status_code)}
                  </span>
                </td>
                <td>{String(r.total_tokens)}</td>
                <td className="flex gap-2">
                  {r.has_nr_apm && <LinkIcon className="h-5 w-5 text-platform-newrelic" title="NR APM" />}
                  {r.has_incident && (
                    <CheckCircleIcon className="h-5 w-5 text-platform-servicenow" title="Incident" />
                  )}
                  <Link to="/correlation" className="text-sm font-medium text-db-red hover:underline">
                    Correlate
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </AppShell>
  );
}
