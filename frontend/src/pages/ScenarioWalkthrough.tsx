import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AppShell,
  ErrorBanner,
  LoadingState,
  PageTitle,
} from '../components/layout/AppShell';
import { CrossPlatformTimeline } from '../components/integration/CrossPlatformTimeline';
import { PlatformBadge, platformBorder } from '../components/ui/PlatformBadge';
import { api } from '../lib/api';
import type { Platform } from '../lib/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function ScenarioWalkthrough() {
  const { id = 'a' } = useParams();
  const [searchParams] = useSearchParams();
  const presenter = searchParams.get('presenter') === '1';
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [stepData, setStepData] = useState<Record<string, unknown>[]>([]);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.scenario(id).then(setMeta).catch((e) => setError(e.message));
    api.scenarioTimeline(id).then(setTimeline).catch(() => {});
  }, [id]);

  useEffect(() => {
    setError(null);
    api
      .scenarioStep(id, step)
      .then((r) => setStepData(r.data))
      .catch((e) => setError(e.message));
  }, [id, step]);

  const steps = (meta?.steps as { step: number; platform: Platform; title: string }[]) ?? [];
  const current = steps.find((s) => s.step === step);

  const renderChart = () => {
    if (!stepData.length) {
      if (id === 'b' && step === 5) {
        return (
          <div className="rounded-md border border-platform-newrelic bg-emerald-50/50 p-4 text-center">
            <p className="text-base font-semibold text-emerald-800">New Relic shows nothing. All green.</p>
            <p className="mt-1 text-sm text-db-gray-600">Infrastructure monitoring sees no alerts — key pivot moment.</p>
          </div>
        );
      }
      return <p className="text-base text-db-gray-400">No data for this step in the current window.</p>;
    }

    if (stepData[0]?.day != null && stepData[0]?.error_rate != null) {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stepData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="error_rate" stroke="#FF3621" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (stepData[0]?.status_code != null && stepData[0]?.cnt != null) {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stepData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status_code" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cnt" fill="#FF3621" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (stepData[0]?.metric_name != null) {
      const grouped = stepData.reduce<Record<string, Record<string, unknown>[]>>((acc, row) => {
        const name = String(row.metric_name);
        acc[name] = acc[name] || [];
        acc[name].push(row);
        return acc;
      }, {});
      const chartData = (grouped['queue_depth'] || stepData).map((_, i) => ({
        ts: String(stepData[i]?.timestamp ?? i),
        queue_depth: grouped['queue_depth']?.[i]?.metric_value,
        request_rate: grouped['request_rate_per_sec']?.[i]?.metric_value,
      }));
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ts" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="queue_depth" stroke="#1CE783" name="queue_depth" />
            <Line type="monotone" dataKey="request_rate" stroke="#2272B4" name="request_rate" />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (stepData[0]?.number != null) {
      const row = stepData[0];
      return (
        <div className="space-y-2 text-base">
          <p>
            <span className="font-semibold">{String(row.number)}</span> — {String(row.short_description)}
          </p>
          <p className="text-db-gray-600">{String(row.description ?? '')}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm text-db-gray-500">
            <div>Priority: {String(row.priority)}</div>
            <div>State: {String(row.state)}</div>
            <div>MTTR: {String(row.mttr_minutes)} min</div>
            <div>Users: {String(row.affected_users_count)}</div>
          </dl>
        </div>
      );
    }

    return (
      <div className="max-h-64 overflow-auto">
        <table className="table-compact w-full">
          <thead>
            <tr className="border-b bg-db-gray-50">
              {Object.keys(stepData[0]).slice(0, 6).map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stepData.slice(0, 15).map((row, i) => (
              <tr key={i} className="border-b border-db-gray-100">
                {Object.keys(stepData[0]).slice(0, 6).map((k) => (
                  <td key={k} className="font-mono">
                    {String(row[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!meta) return <AppShell><LoadingState /></AppShell>;

  return (
    <AppShell>
      <PageTitle
        title={String(meta.title)}
        subtitle={String(meta.theme)}
      />
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 pb-16 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <ol className="space-y-0.5">
            {steps.map((s) => (
              <li key={s.step}>
                <button
                  type="button"
                  onClick={() => setStep(s.step)}
                  className={`flex w-full items-start gap-2 rounded-md border-l-2 px-3 py-2 text-left text-sm ${
                    step === s.step
                      ? 'border-db-red bg-db-red/10'
                      : `border-transparent hover:bg-db-gray-50 ${platformBorder(s.platform)}`
                  }`}
                >
                  <span className="font-mono text-sm text-db-gray-400">{s.step}</span>
                  <div>
                    <PlatformBadge platform={s.platform} compact />
                    <p className="mt-1.5 text-sm leading-snug">{s.title}</p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="xl:col-span-6">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              {current && <PlatformBadge platform={current.platform} />}
              <span className="text-base font-semibold">{current?.title}</span>
            </div>
            {renderChart()}
            {id === 'a' && step === 3 && (
              <div className="mt-3 border-l-4 border-platform-newrelic bg-sky-50/50 p-3 text-sm">
                Root cause: infrastructure, not agent logic
              </div>
            )}
            <Link to={`/correlation?scenario=${id}`} className="btn-secondary mt-3 inline-block">
              Open in Correlation →
            </Link>
          </div>
          <div className="card mt-3 p-4">
            <h4 className="mb-2 text-base font-bold text-db-navy">Cross-platform timeline</h4>
            <CrossPlatformTimeline events={timeline} compact />
          </div>
        </div>

        <aside className="xl:col-span-3">
          <div className="card p-4">
            <p className="text-base font-bold text-db-navy">Key message</p>
            <p className="mt-2 text-sm leading-snug text-db-gray-600">{String(meta.keyMessage)}</p>
            <p className="mt-3 font-mono text-xs text-db-gray-400">{String(meta.incidentNumber)}</p>
          </div>
        </aside>
      </div>

      {presenter && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between border-t border-db-gray-200 bg-white px-4 py-2 lg:left-52">
          <button type="button" className="btn-secondary" disabled={step <= 1} onClick={() => setStep(step - 1)}>
            ← Previous
          </button>
          <span className="text-base font-medium">Step {step} / 6</span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => (step >= 6 ? navigate('/scenarios') : setStep(step + 1))}
          >
            {step >= 6 ? 'Wrap-up →' : 'Next →'}
          </button>
        </div>
      )}
    </AppShell>
  );
}
