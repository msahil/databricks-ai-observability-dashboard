import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { MetricStat } from '../ui/KpiTile';

const NODES = [
  {
    label: 'MLflow',
    platform: 'border-platform-databricks bg-red-50/80 text-db-navy',
    link: '/traces',
  },
  {
    label: 'AI Gateway',
    platform: 'border-platform-databricks bg-orange-50/80 text-db-navy',
    link: '/gateway',
  },
  {
    label: 'New Relic',
    platform: 'border-platform-newrelic bg-emerald-50/80 text-db-navy',
    link: '/correlation',
  },
  {
    label: 'ServiceNow',
    platform: 'border-platform-servicenow bg-teal-50/80 text-db-navy',
    link: '/incidents',
  },
];

export function SignalFlowDiagram() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.platformHealth()
      .then((d) => setCount(Number(d.correlation_count) || 0))
      .catch(() => setCount(null));
  }, []);

  return (
    <section className="section">
      <div className="rounded-lg border border-db-gray-200/90 bg-white p-3 shadow-panel">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-eyebrow">Integration</p>
            <h3 className="text-lg font-bold text-db-navy">Cross-platform correlation chain</h3>
          </div>
          {count != null && (
            <div className="w-40">
              <MetricStat label="Linked chains" value={count.toLocaleString()} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {NODES.map((node, i) => (
            <span key={node.label} className="flex items-center gap-1.5">
              <Link
                to={node.link}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition hover:shadow-sm ${node.platform}`}
              >
                {node.label}
              </Link>
              {i < NODES.length - 1 && (
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-db-gray-300" />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
