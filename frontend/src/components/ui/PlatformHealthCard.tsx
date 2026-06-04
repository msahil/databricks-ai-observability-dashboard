import { PlatformBadge } from './PlatformBadge';
import { MetricStat } from './KpiTile';
import { LoadingState } from '../layout/AppShell';

type Platform = 'databricks' | 'newrelic' | 'servicenow';

const BORDER: Record<Platform, string> = {
  databricks: 'border-t-platform-databricks',
  newrelic: 'border-t-platform-newrelic',
  servicenow: 'border-t-platform-servicenow',
};

const BG: Record<Platform, string> = {
  databricks: 'from-red-50/40',
  newrelic: 'from-emerald-50/40',
  servicenow: 'from-teal-50/40',
};

export function PlatformHealthCard({
  platform,
  metrics,
  loading,
}: {
  platform: Platform;
  metrics: { label: string; value: string; alert?: boolean }[];
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-db-gray-200 border-t-4 bg-gradient-to-b to-white shadow-kpi ${BORDER[platform]} ${BG[platform]} p-5`}
    >
      <PlatformBadge platform={platform} />
      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-db-gray-200" />
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map(({ label, value, alert }) => (
            <MetricStat key={label} label={label} value={value} alert={alert} />
          ))}
        </dl>
      )}
    </div>
  );
}

export function PlatformHealthGrid({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LoadingState />
        <LoadingState />
        <LoadingState />
      </div>
    );
  }
  return <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">{children}</div>;
}
