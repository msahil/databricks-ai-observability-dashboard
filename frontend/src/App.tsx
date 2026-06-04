import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Overview from './pages/Overview';
import Scenarios from './pages/Scenarios';
import ScenarioWalkthrough from './pages/ScenarioWalkthrough';
import Agents from './pages/Agents';
import Traces from './pages/Traces';
import Gateway from './pages/Gateway';
import Tools from './pages/Tools';
import Incidents from './pages/Incidents';
import Correlation from './pages/Correlation';

function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('control-tower-welcome')) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="card max-w-md p-6">
        <h2 className="text-2xl font-bold text-db-navy">Unified AI Observability Control Tower</h2>
        <p className="mt-3 text-base text-db-gray-600">
          One control tower across AI traces, Unity AI Gateway, infrastructure, and ITSM.
        </p>
        <p className="mt-2 text-sm text-db-gray-500">E.ON hub-and-spoke · 28 agents · 6 regions · Databricks · New Relic · ServiceNow</p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => {
              localStorage.setItem('control-tower-welcome', '1');
              setOpen(false);
              navigate('/scenarios');
            }}
          >
            Explore scenarios
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => {
              localStorage.setItem('control-tower-welcome', '1');
              setOpen(false);
            }}
          >
            Go to overview
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <WelcomeModal />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/scenarios/:id" element={<ScenarioWalkthrough />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/traces" element={<Traces />} />
        <Route path="/gateway" element={<Gateway />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/correlation" element={<Correlation />} />
      </Routes>
    </>
  );
}
