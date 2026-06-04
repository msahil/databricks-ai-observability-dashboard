import { platformBorder } from '../ui/PlatformBadge';
import type { Platform } from '../../lib/types';

interface Event {
  platform?: string;
  platform_group?: string;
  event_time?: string;
  ts?: string;
  summary?: string;
  label?: string;
}

interface Props {
  events: Event[];
  compact?: boolean;
}

export function CrossPlatformTimeline({ events, compact }: Props) {
  if (!events.length) {
    return (
      <div className="rounded-md border border-db-gray-200 bg-db-gray-50 p-4 text-center text-sm text-db-gray-400">
        No cross-platform events in this window
      </div>
    );
  }

  return (
    <div className={compact ? 'max-h-48 overflow-y-auto' : 'max-h-96 overflow-y-auto'}>
      <ul className="space-y-0">
        {events.map((ev, i) => {
          const platform = (ev.platform_group || ev.platform || 'databricks') as Platform;
          const time = ev.event_time || ev.ts;
          const summary = ev.summary || ev.label || 'Event';
          return (
            <li key={`${time}-${i}`} className={`relative border-l-2 py-2 pl-3 ${platformBorder(platform)}`}>
              <p className="font-mono text-xs text-db-gray-400">{String(time)}</p>
              <p className="text-sm font-medium leading-snug text-db-gray-800">{summary}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
