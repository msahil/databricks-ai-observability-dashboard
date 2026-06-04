import { AppShell, PageTitle } from '../components/layout/AppShell';

export default function Tools() {
  return (
    <AppShell>
      <PageTitle title="Tool Access" subtitle="Unity Catalog governance — MCP tools and data access logs" />
      <div className="card p-5 text-center text-sm text-db-gray-500">
        Tool access logs and MCP catalog — query via correlation view for denied access events.
      </div>
    </AppShell>
  );
}
