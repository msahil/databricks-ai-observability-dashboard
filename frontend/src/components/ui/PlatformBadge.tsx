import { cn } from '../../lib/formatters';
import type { Platform } from '../lib/types';

const PLATFORM_META: Record<Platform, { label: string; color: string; role: string }> = {
  databricks: { label: 'Databricks', color: 'border-platform-databricks text-platform-databricks', role: 'AI-Native' },
  newrelic: { label: 'New Relic', color: 'border-platform-newrelic text-emerald-600', role: 'Infrastructure' },
  servicenow: { label: 'ServiceNow', color: 'border-platform-servicenow text-teal-700', role: 'Remediation' },
};

interface Props {
  platform: Platform;
  active?: boolean;
  compact?: boolean;
}

export function PlatformBadge({ platform, active = true, compact }: Props) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium',
        meta.color,
        !active && 'opacity-40',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full bg-current', !active && 'bg-db-gray-300')} />
      {compact ? platform.slice(0, 2).toUpperCase() : meta.label}
    </span>
  );
}

export function platformBorder(platform: Platform) {
  const map: Record<Platform, string> = {
    databricks: 'border-platform-databricks',
    newrelic: 'border-platform-newrelic',
    servicenow: 'border-platform-servicenow',
  };
  return map[platform];
}

export { PLATFORM_META };
