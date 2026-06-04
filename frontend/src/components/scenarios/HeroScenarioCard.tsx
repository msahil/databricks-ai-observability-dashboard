import { Link } from 'react-router-dom';
import { ArrowRightIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { PlatformBadge } from '../ui/PlatformBadge';
import type { HeroScenario } from '../../lib/types';

interface Props {
  scenario: HeroScenario;
}

export function HeroScenarioCard({ scenario }: Props) {
  const badgeClass = scenario.priority === 'P1' ? 'badge-critical' : 'badge-warning';

  return (
    <Link
      to={`/scenarios/${scenario.id}`}
      className="card group flex h-full flex-col p-4 transition hover:border-db-red/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={badgeClass}>{scenario.priority} · {scenario.id.toUpperCase()}</span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-db-gray-300 group-hover:text-db-red" />
      </div>
      <h3 className="mt-2 text-lg font-bold leading-snug text-db-navy">{scenario.title}</h3>
      <p className="mt-0.5 text-sm font-medium text-db-gray-500">{scenario.theme}</p>
      <p className="mt-2 flex-1 border-l-2 border-db-red/25 pl-2 text-sm leading-snug text-db-gray-600">
        {scenario.keyMessage}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <PlatformBadge platform="databricks" active={scenario.platformVisibility.databricks} compact />
        <PlatformBadge platform="newrelic" active={scenario.platformVisibility.newrelic} compact />
        <PlatformBadge platform="servicenow" active={scenario.platformVisibility.servicenow} compact />
      </div>
      <p className="mt-2 text-xs text-db-gray-400">
        {scenario.incidentNumber} · {scenario.regions.join(', ')} · ~{scenario.durationMin} min
      </p>
      <span className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-1.5 py-2">
        <PlayCircleIcon className="h-4 w-4" />
        Start walkthrough
      </span>
    </Link>
  );
}
