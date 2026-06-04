import { cn } from '../../lib/formatters';

export type KpiStatus = 'ok' | 'warn' | 'bad' | 'neutral';

const STATUS_STYLES: Record<
  KpiStatus,
  { value: string; ring: string; bg: string; badge: string }
> = {
  ok: {
    value: 'text-status-healthy',
    ring: 'ring-status-healthy/20',
    bg: 'from-emerald-50/90 to-white',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  warn: {
    value: 'text-status-warning',
    ring: 'ring-status-warning/25',
    bg: 'from-amber-50/90 to-white',
    badge: 'bg-amber-100 text-amber-800',
  },
  bad: {
    value: 'text-status-critical',
    ring: 'ring-status-critical/25',
    bg: 'from-red-50/90 to-white',
    badge: 'bg-red-100 text-red-800',
  },
  neutral: {
    value: 'text-db-navy',
    ring: 'ring-db-gray-200/80',
    bg: 'from-db-gray-50/90 to-white',
    badge: 'bg-db-gray-100 text-db-gray-600',
  },
};

const ACCENT_BORDER: Record<string, string> = {
  databricks: 'border-l-platform-databricks',
  newrelic: 'border-l-platform-newrelic',
  servicenow: 'border-l-platform-servicenow',
  default: 'border-l-db-red',
};

export function KpiTile({
  label,
  value,
  status = 'neutral',
  hint,
  accent = 'default',
  size = 'lg',
  className,
}: {
  label: string;
  value: string;
  status?: KpiStatus;
  hint?: string;
  accent?: keyof typeof ACCENT_BORDER;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const s = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-db-gray-200/90 bg-gradient-to-br shadow-panel ring-1',
        s.ring,
        s.bg,
        `border-l-4 ${ACCENT_BORDER[accent]}`,
        size === 'lg' ? 'p-3' : 'p-2.5',
        className,
      )}
    >
      {status !== 'neutral' && (
        <span
          className={cn(
            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold',
            s.badge,
          )}
        >
          {status === 'ok' ? 'Healthy' : status === 'warn' ? 'Warning' : 'Critical'}
        </span>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-db-gray-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-bold tabular-nums tracking-tight',
          s.value,
          size === 'lg' ? 'text-2xl lg:text-3xl' : 'text-xl',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-db-gray-500">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const colClass =
    cols === 2
      ? 'sm:grid-cols-2'
      : cols === 3
        ? 'sm:grid-cols-3'
        : cols === 5
          ? 'sm:grid-cols-2 lg:grid-cols-5'
          : 'sm:grid-cols-2 lg:grid-cols-4';

  return <div className={cn('grid grid-cols-1 gap-3', colClass)}>{children}</div>;
}

export function MetricStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md bg-white/90 px-2.5 py-2 ring-1 ring-db-gray-200/80',
        alert && 'bg-red-50/50 ring-status-critical/30',
      )}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-db-gray-500">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 font-mono text-xl font-bold tabular-nums leading-none',
          alert ? 'text-status-critical' : 'text-db-navy',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
