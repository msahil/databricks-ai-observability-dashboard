import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell, ErrorBanner, LoadingState, PageTitle } from '../components/layout/AppShell';
import { CrossPlatformTimeline } from '../components/integration/CrossPlatformTimeline';
import { SignalFlowDiagram } from '../components/integration/SignalFlowDiagram';
import { KpiGrid, KpiTile } from '../components/ui/KpiTile';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../lib/api';

export default function Correlation() {
  const [searchParams] = useSearchParams();
  const platform = searchParams.get('platform') || 'all';
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .correlationTimeline(platform)
      .then(setEvents)
      .catch((e) => {
        setEvents([]);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [platform]);

  const byPlatform = (p: string) => events.filter((e) => String(e.platform) === p).length;

  return (
    <AppShell>
      <PageTitle
        title="Cross-Platform Correlation"
        subtitle="Unified timeline — MLflow → Unity AI Gateway → New Relic → ServiceNow"
      />
      {error && <ErrorBanner message={error} />}

      {events.length > 0 && (
        <section className="section">
          <SectionHeader eyebrow="Summary" title="Timeline KPIs" compact />
          <KpiGrid cols={4}>
            <KpiTile label="Total Events" value={String(events.length)} accent="default" />
            <KpiTile label="Databricks" value={String(byPlatform('databricks'))} accent="databricks" />
            <KpiTile label="New Relic" value={String(byPlatform('newrelic'))} accent="newrelic" />
            <KpiTile label="ServiceNow" value={String(byPlatform('servicenow'))} accent="servicenow" />
          </KpiGrid>
        </section>
      )}

      <SignalFlowDiagram />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {['all', 'databricks', 'newrelic', 'servicenow'].map((p) => (
          <Link
            key={p}
            to={`/correlation?platform=${p}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              platform === p ? 'bg-db-red text-white' : 'bg-db-gray-100 text-db-gray-600 hover:bg-db-gray-200'
            }`}
          >
            {p === 'all' ? 'All platforms' : p}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="card p-4 xl:col-span-8">
          <h3 className="mb-2 text-lg font-bold text-db-navy">Unified timeline</h3>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <p className="text-base text-db-gray-500">Timeline unavailable — see error above.</p>
          ) : (
            <CrossPlatformTimeline events={events} />
          )}
        </div>
        <div className="card p-4 xl:col-span-4">
          <h3 className="text-lg font-bold text-db-navy">Hero scenarios</h3>
          <ul className="mt-2 space-y-2">
            {[
              { id: 'a', label: 'Cross-Agent Cascade' },
              { id: 'b', label: 'Token Exhaustion' },
              { id: 'c', label: 'Model Drift' },
            ].map((s) => (
              <li key={s.id} className="flex items-center justify-between border-b border-db-gray-100 py-2">
                <span className="text-sm font-medium">{s.label}</span>
                <Link to={`/scenarios/${s.id}`} className="btn-secondary">
                  Walkthrough
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
