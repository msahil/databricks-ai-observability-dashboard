import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatNumber, formatPct } from '../../lib/formatters';
import { MetricStat } from '../ui/KpiTile';
import { SectionHeader } from '../ui/SectionHeader';
import { PLATFORM_META } from '../ui/PlatformBadge';

type PlatformKey = 'databricks' | 'newrelic' | 'servicenow';

const LINKS: Record<PlatformKey, string> = {
  databricks: '/gateway',
  newrelic: '/correlation?platform=newrelic',
  servicenow: '/incidents',
};

const BORDER: Record<PlatformKey, string> = {
  databricks: 'border-t-platform-databricks',
  newrelic: 'border-t-platform-newrelic',
  servicenow: 'border-t-platform-servicenow',
};

const BG: Record<PlatformKey, string> = {
  databricks: 'from-red-50/40',
  newrelic: 'from-emerald-50/40',
  servicenow: 'from-teal-50/40',
};

export function PlatformIntegrationStrip() {
  const [data, setData] = useState<Record<string, Record<string, number>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.integrationStrip()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const columns: {
    key: PlatformKey;
    metrics: { label: string; value: string; alert?: boolean }[];
  }[] = [
    {
      key: 'databricks',
      metrics: [
        {
          label: 'Gateway Errors',
          value:
            data?.databricks?.gateway_error_pct != null
              ? formatPct(data.databricks.gateway_error_pct)
              : '—',
          alert: Number(data?.databricks?.gateway_error_pct) > 5,
        },
        {
          label: 'Failed Runs',
          value: String(data?.databricks?.failed_runs ?? '—'),
          alert: Number(data?.databricks?.failed_runs) > 0,
        },
        {
          label: 'Denied Access',
          value: String(data?.databricks?.denied_access ?? '—'),
          alert: Number(data?.databricks?.denied_access) > 0,
        },
      ],
    },
    {
      key: 'newrelic',
      metrics: [
        {
          label: 'Critical Alerts',
          value: String(data?.newrelic?.critical_alerts ?? '—'),
          alert: Number(data?.newrelic?.critical_alerts) > 0,
        },
        {
          label: 'APM Errors',
          value:
            data?.newrelic?.apm_error_pct != null ? formatPct(data.newrelic.apm_error_pct) : '—',
          alert: Number(data?.newrelic?.apm_error_pct) > 5,
        },
        {
          label: 'Max Queue',
          value: formatNumber(data?.newrelic?.max_queue_depth, 0),
          alert: Number(data?.newrelic?.max_queue_depth) > 100,
        },
      ],
    },
    {
      key: 'servicenow',
      metrics: [
        {
          label: 'Open P1/P2',
          value: String(data?.servicenow?.open_incidents ?? '—'),
          alert: Number(data?.servicenow?.open_incidents) > 0,
        },
        {
          label: 'Avg MTTR',
          value: `${formatNumber(data?.servicenow?.avg_mttr, 0)} min`,
        },
        {
          label: 'Pending Changes',
          value: String(data?.servicenow?.pending_changes ?? '—'),
        },
      ],
    },
  ];

  return (
    <section className="section">
      <SectionHeader
        eyebrow="Real-time"
        title="Live platform signals"
        compact
        action={
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-status-healthy">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-healthy opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-healthy" />
            </span>
            Live
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {columns.map(({ key, metrics }) => {
          const meta = PLATFORM_META[key];
          return (
            <Link
              key={key}
              to={LINKS[key]}
              className={`group rounded-lg border border-db-gray-200/90 border-t-[3px] bg-gradient-to-b to-white shadow-panel transition hover:border-db-gray-300 ${BORDER[key]} ${BG[key]} p-3`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-db-navy">{meta.label}</p>
                  <p className="text-sm text-db-gray-500">{meta.role}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-db-red group-hover:underline">
                  Details →
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2">
                {metrics.map(({ label, value, alert }) => (
                  <MetricStat key={label} label={label} value={value} alert={alert} />
                ))}
              </dl>
              {error && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">
                  Data unavailable
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
