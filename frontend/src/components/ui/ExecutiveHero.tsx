import { PlatformBadge } from './PlatformBadge';

export function ExecutiveHero() {
  return (
    <div className="executive-hero section overflow-hidden rounded-lg border border-db-gray-200/80 bg-white px-3 py-2.5 shadow-panel">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow">Executive Command Center</p>
          <h2 className="text-lg font-bold leading-snug tracking-tight text-db-navy">
            Unified visibility across AI, infrastructure, and IT operations
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <PlatformBadge platform="databricks" />
          <PlatformBadge platform="newrelic" />
          <PlatformBadge platform="servicenow" />
          <span className="text-sm text-db-gray-400">28 agents · 6 regions</span>
        </div>
      </div>
    </div>
  );
}
