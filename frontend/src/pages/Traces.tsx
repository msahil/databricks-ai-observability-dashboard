import { useEffect, useState } from 'react';
import { AppShell, ErrorBanner, LoadingState, PageTitle } from '../components/layout/AppShell';
import { api } from '../lib/api';

export default function Traces() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.traces().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <PageTitle title="Traces" subtitle="MLflow runs — correlated with Unity AI Gateway and New Relic APM" />
      {error && <ErrorBanner message={error} />}
      {!rows.length ? (
        <LoadingState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-compact w-full">
            <thead>
              <tr className="border-b text-sm font-semibold uppercase tracking-wide text-db-gray-500">
                <th>Run</th>
                <th>Status</th>
                <th>Region</th>
                <th>Started</th>
                <th>Latency</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={String(r.run_id)}
                  className={`border-b ${r.status !== 'FINISHED' ? 'border-l-2 border-status-critical bg-red-50/50' : ''}`}
                >
                  <td className="max-w-xs truncate font-mono text-sm">{String(r.run_name)}</td>
                  <td>
                    <span className={r.status === 'FINISHED' ? 'badge-healthy' : 'badge-critical'}>
                      {String(r.status)}
                    </span>
                  </td>
                  <td>{String(r.region ?? '—')}</td>
                  <td className="font-mono text-sm">{String(r.start_time)}</td>
                  <td>{String(r.latency_ms ?? '—')}</td>
                  <td>{String(r.feedback_score ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
