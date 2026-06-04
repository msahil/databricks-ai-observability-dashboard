import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  PlayCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { cn } from '../../lib/formatters';

const NAV = [
  { to: '/', label: 'Overview', icon: HomeIcon },
  { to: '/scenarios', label: 'Scenarios', icon: PlayCircleIcon },
  { to: '/agents', label: 'Agents', icon: UserGroupIcon },
  { to: '/traces', label: 'Traces', icon: ChartBarIcon },
  { to: '/gateway', label: 'Unity AI Gateway', icon: ArrowsRightLeftIcon },
  { to: '/tools', label: 'Tool Access', icon: WrenchScrewdriverIcon },
  { to: '/incidents', label: 'Incidents', icon: ExclamationTriangleIcon },
  { to: '/correlation', label: 'Correlation', icon: LinkIcon },
];

interface Props {
  children: React.ReactNode;
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all',
          isActive
            ? 'bg-white/15 font-semibold text-white shadow-inner ring-1 ring-white/10'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" />
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: Props) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.find(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)));

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-52 shrink-0 flex-col bg-sidebar-gradient text-white lg:flex">
        <div className="border-b border-white/10 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-db-red text-xs font-bold">
              AI
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Control Tower</p>
              <p className="text-xs text-white/50">Observability</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Integrated stack</p>
          <div className="mt-2 space-y-0.5 text-sm text-white/60">
            <p>Databricks · AI signal</p>
            <p>New Relic · Infrastructure</p>
            <p>ServiceNow · Remediation</p>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar-gradient text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="text-base font-bold">Control Tower</span>
              <button type="button" onClick={() => setOpen(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {NAV.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-db-gray-200/80 bg-white/95 px-4 py-1.5 backdrop-blur-sm lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className="lg:hidden" onClick={() => setOpen(true)}>
                <Bars3Icon className="h-5 w-5 text-db-navy" />
              </button>
              <div>
                <h1 className="text-base font-bold tracking-tight text-db-navy lg:text-lg">
                  {current?.label ?? 'Control Tower'}
                </h1>
                <p className="text-xs text-db-gray-500">Unified AI Observability</p>
              </div>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-db-gray-200 bg-db-gray-50 px-3 py-1 text-xs font-medium text-db-gray-600 md:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-healthy opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-healthy" />
              </span>
              Live environment
            </div>
          </div>
        </header>
        <main className="flex-1 bg-gradient-to-b from-db-gray-50 to-white px-4 py-2.5 lg:px-5 lg:py-3">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  if (!subtitle) return null;
  return (
    <p className="mb-3 max-w-3xl text-sm text-db-gray-500" aria-label={title}>
      {subtitle}
    </p>
  );
}

export function LoadingState() {
  return <div className="h-16 animate-pulse rounded-lg bg-db-gray-200/80" />;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {message}
    </div>
  );
}
