import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, ErrorBanner, LoadingState } from '../components/layout/AppShell';
import { PlatformIntegrationStrip } from '../components/integration/PlatformIntegrationStrip';
import { SignalFlowDiagram } from '../components/integration/SignalFlowDiagram';
import { HeroScenarioCard } from '../components/scenarios/HeroScenarioCard';
import { ExecutiveHero } from '../components/ui/ExecutiveHero';
import { KpiGrid, KpiTile } from '../components/ui/KpiTile';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../lib/api';
import { formatPct } from '../lib/formatters';
import type { HeroScenario } from '../lib/types';

export default function Overview() {
  const [kpis, setKpis] = useState<Record<string, number> | null>(null);
  const [scenarios, setScenarios] = useState<HeroScenario[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([api.kpis(), api.scenarios()]).then((results) => {
      const [kpiResult, scenarioResult] = results;
      if (kpiResult.status === 'fulfilled') {
        setKpis(kpiResult.value[0] ?? null);
      }
      if (scenarioResult.status === 'fulfilled') {
        setScenarios(scenarioResult.value);
      }
      const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed) {
        setError(failed.reason?.message ?? 'Failed to load overview data');
      }
    });
  }, []);

  return (
    <AppShell>
      {error && <ErrorBanner message={error} />}

      <ExecutiveHero />
      <PlatformIntegrationStrip />

      {!kpis ? (
        <LoadingState />
      ) : (
        <section className="section">
          <SectionHeader eyebrow="Fleet health" title="Key performance indicators" compact />
          <KpiGrid>
            <KpiTile
              label="Active Agents"
              value={String(kpis.active_agents ?? '—')}
              hint="6 regions"
              accent="databricks"
            />
            <KpiTile
              label="Run Success Rate"
              value={formatPct(kpis.success_rate)}
              status={Number(kpis.success_rate) < 95 ? 'bad' : 'ok'}
              hint="30-day window"
              accent="databricks"
            />
            <KpiTile
              label="Open Incidents"
              value={String(kpis.open_incidents ?? 0)}
              status={Number(kpis.open_incidents) > 0 ? 'bad' : 'ok'}
              hint="P1 / P2"
              accent="servicenow"
            />
            <KpiTile
              label="Gateway Error Rate"
              value={formatPct(kpis.gateway_error_rate)}
              status={
                Number(kpis.gateway_error_rate) > 5
                  ? 'bad'
                  : Number(kpis.gateway_error_rate) > 2
                    ? 'warn'
                    : 'ok'
              }
              hint="Unity AI Gateway"
              accent="databricks"
            />
          </KpiGrid>
        </section>
      )}

      <SignalFlowDiagram />

      <section>
        <SectionHeader
          eyebrow="Guided walkthroughs"
          title="Hero scenarios"
          compact
          action={
            <Link to="/scenarios" className="btn-secondary">
              View all
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {scenarios.map((s) => (
            <HeroScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
