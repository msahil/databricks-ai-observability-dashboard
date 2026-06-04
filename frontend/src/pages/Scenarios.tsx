import { useEffect, useState } from 'react';
import { AppShell, PageTitle } from '../components/layout/AppShell';
import { HeroScenarioCard } from '../components/scenarios/HeroScenarioCard';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../lib/api';
import type { HeroScenario } from '../lib/types';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<HeroScenario[]>([]);

  useEffect(() => {
    api.scenarios().then(setScenarios);
  }, []);

  return (
    <AppShell>
      <PageTitle title="Scenarios" subtitle="Guided walkthroughs — recommended order A → B → C (~15 min)" />

      <div className="section rounded-lg border border-db-navy/10 bg-db-navy/5 px-4 py-3 text-sm">
        Each scenario reveals a failure pattern visible to one platform but invisible to others.
      </div>

      <div className="section grid grid-cols-1 gap-3 md:grid-cols-3">
        {(['databricks', 'newrelic', 'servicenow'] as const).map((p) => (
          <div key={p} className="card p-3">
            <PlatformBadge platform={p} />
            <p className="mt-2 text-sm text-db-gray-600">
              {p === 'databricks' && 'AI-native signal: traces, Unity AI Gateway, governance'}
              {p === 'newrelic' && 'Infrastructure signal: APM, compute, network health'}
              {p === 'servicenow' && 'Action: incidents, remediation, compliance'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {scenarios.map((s) => (
          <HeroScenarioCard key={s.id} scenario={s} />
        ))}
      </div>

      <section className="card mt-6 p-4">
        <SectionHeader title="Platform visibility matrix" compact />
        <table className="mt-4 w-full table-compact">
          <thead>
            <tr className="border-b text-left text-sm font-semibold uppercase tracking-wide text-db-gray-500">
              <th>Scenario</th>
              <th>Databricks</th>
              <th>New Relic</th>
              <th>ServiceNow</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id} className="border-b border-db-gray-100">
                <td className="font-medium">{s.title}</td>
                <td>{s.platformVisibility.databricks ? '✓ Detects' : '—'}</td>
                <td>{s.platformVisibility.newrelic ? '✓ Correlates' : '✗ Silent'}</td>
                <td>{s.platformVisibility.servicenow ? '✓ Remediates' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <blockquote className="mt-3 border-l-4 border-db-red pl-3 text-sm italic leading-snug text-db-gray-600">
          Databricks owns the AI-native signal. New Relic owns infrastructure correlation. ServiceNow owns
          automated response. The integrated stack eliminates blind spots that exist when any platform operates alone.
        </blockquote>
      </section>
    </AppShell>
  );
}
