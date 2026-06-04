import { useEffect, useState } from 'react';
import { AppShell, ErrorBanner, LoadingState, PageTitle } from '../components/layout/AppShell';
import { api } from '../lib/api';

export default function Agents() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.agents().then(setAgents).catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <PageTitle title="Agents" subtitle="28 agents across 6 regions — hub-and-spoke deployment" />
      {error && <ErrorBanner message={error} />}
      {!agents.length ? (
        <LoadingState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-compact w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-sm font-semibold uppercase tracking-wide text-db-gray-500">
                <th>Agent</th>
                <th>Region</th>
                <th>Cloud</th>
                <th>Framework</th>
                <th>Team</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={String(a.agent_id)} className="border-b border-db-gray-100 hover:bg-db-gray-50">
                  <td className="font-medium">{String(a.agent_name)}</td>
                  <td className="font-mono text-sm">{String(a.region)}</td>
                  <td>{String(a.cloud_provider)}</td>
                  <td>{String(a.agent_framework)}</td>
                  <td>{String(a.owner_team)}</td>
                  <td>
                    <span className={a.status === 'active' ? 'badge-healthy' : 'badge-warning'}>
                      {String(a.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
