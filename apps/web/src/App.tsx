import { useState, useCallback } from 'react';
import { useSSE } from './hooks/useSSE';
import { useAtlas } from './hooks/useAtlas';
import TopologyPanel from './components/TopologyPanel';
import ScenarioLauncher from './components/ScenarioLauncher';
import Terminal from './components/Terminal';
import KPIPanel from './components/KPIPanel';
import ScenarioNotes from './components/ScenarioNotes';
import ConnectionBadge from './components/ConnectionBadge';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

const TOAST_BG: Record<ToastType, string> = {
  success: 'bg-mdb-green text-black',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-700 text-white',
};

export default function App() {
  const { connected, terminalEvents, metrics, clearTerminal } = useSSE();
  const { config, clusterInfo, loading, error, refresh } = useAtlas();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const isRunning = metrics?.workloadStatus === 'running';

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">🍃</span>
          <div>
            <h1 className="text-sm font-semibold font-display text-white leading-tight">
              MongoDB Atlas HA Demo
            </h1>
            <p className="text-xs text-gray-500 leading-tight">
              High Availability &amp; Resilience Blueprint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {config && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full font-mono">
              <span className="text-gray-600">{config.appCloudProvider.toUpperCase()}</span>
              <span className="text-gray-700">/</span>
              <span>{config.appRegion}</span>
            </div>
          )}
          <ConnectionBadge connected={connected} connectionStatus={metrics?.connectionStatus} />
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium font-display transition-all ${TOAST_BG[toast.type]}`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside className="flex flex-col w-64 shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto scrollbar-thin">
          <TopologyPanel
            config={config}
            clusterInfo={clusterInfo}
            loading={loading}
            error={error}
            onRefresh={refresh}
            activeScenario={activeScenario}
            workloadStatus={metrics?.workloadStatus}
          />
          <div className="border-t border-gray-800 flex-1">
            <ScenarioLauncher
              config={config}
              onScenarioChange={setActiveScenario}
              onToast={showToast}
              isRunning={isRunning}
            />
          </div>
        </aside>

        {/* Center: terminal + KPIs */}
        <main className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Terminal
            events={terminalEvents}
            onClear={clearTerminal}
            connectionStatus={metrics?.connectionStatus}
          />
          <div className="shrink-0">
            <KPIPanel metrics={metrics} />
          </div>
        </main>

        {/* Right panel: scenario notes */}
        <aside className="w-72 shrink-0 border-l border-gray-800 bg-gray-900 overflow-y-auto scrollbar-thin">
          <ScenarioNotes activeScenario={activeScenario} metrics={metrics} />
        </aside>
      </div>
    </div>
  );
}
