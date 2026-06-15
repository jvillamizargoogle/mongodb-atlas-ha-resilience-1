import { useState } from 'react';
import {
  Play,
  Square,
  Zap,
  AlertTriangle,
  RotateCcw,
  Globe,
  ShieldOff,
} from 'lucide-react';
import { api } from '../api/client';
import type { PublicConfig } from '@atlas-demo/shared';

interface Props {
  config: PublicConfig | null;
  onScenarioChange: (id: string | null) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isRunning: boolean;
}

type ConfirmAction = 'failover' | 'outage_start' | 'outage_end' | 'reset';

interface ConfirmState {
  action: ConfirmAction | null;
}

export default function ScenarioLauncher({
  config,
  onScenarioChange,
  onToast,
  isRunning,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ action: null });
  const [outageProvider, setOutageProvider] = useState('AWS');
  const [outageRegion, setOutageRegion] = useState('US_EAST_1');

  const atlasEnabled = config?.atlasControlPlaneEnabled ?? false;
  const destructiveEnabled = config?.destructiveActionsEnabled ?? false;

  async function startWorkload(type: 'write' | 'read' | 'update' | 'mixed' | 'bulk') {
    if (loading || isRunning) return;
    setLoading(true);
    try {
      const handlers = {
        write: api.startWriteWorkload,
        read: api.startReadWorkload,
        update: api.startUpdateWorkload,
        mixed: api.startMixedWorkload,
        bulk: api.startBulkWorkload,
      };
      const res = await handlers[type]();
      if (res.success && res.data) {
        onScenarioChange(res.data.scenarioId);
        onToast(`${type} workload started`, 'success');
      } else {
        onToast(res.error ?? 'Failed to start workload', 'error');
      }
    } catch {
      onToast('Network error starting workload', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function stopWorkload() {
    if (loading) return;
    setLoading(true);
    try {
      await api.stopWorkload();
      onScenarioChange(null);
      onToast('Workload stop signal sent', 'info');
    } finally {
      setLoading(false);
    }
  }

  async function triggerFailover() {
    setLoading(true);
    setConfirm({ action: null });
    try {
      const res = await api.triggerFailover(true);
      if (res.success) onToast('Failover triggered — election in progress', 'success');
      else onToast(res.error ?? 'Failover failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function startOutage() {
    setLoading(true);
    setConfirm({ action: null });
    try {
      const res = await api.startOutage(true, outageProvider, outageRegion);
      if (res.success)
        onToast(`Outage simulation started: ${outageProvider}/${outageRegion}`, 'success');
      else onToast(res.error ?? 'Outage start failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function endOutage() {
    setLoading(true);
    setConfirm({ action: null });
    try {
      const res = await api.endOutage();
      if (res.success) onToast('Outage simulation ended', 'success');
      else onToast(res.error ?? 'Outage end failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resetDemo() {
    setLoading(true);
    setConfirm({ action: null });
    try {
      const res = await api.resetDemo();
      if (res.success)
        onToast(`Reset complete — ${res.data?.deleted ?? 0} documents deleted`, 'info');
      else onToast(res.error ?? 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  const BASE =
    'w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const btnGreen = `${BASE} bg-mdb-green/10 hover:bg-mdb-green/20 text-mdb-green border border-mdb-green/30 hover:border-mdb-green/60`;
  const btnRed = `${BASE} bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/60 hover:border-red-700`;
  const btnOrange = `${BASE} bg-orange-950/60 hover:bg-orange-900/60 text-orange-400 border border-orange-900/60 hover:border-orange-700`;
  const btnGray = `${BASE} bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/60 hover:border-gray-600`;

  const CONFIRM_COPY: Record<ConfirmAction, string> = {
    failover:
      'This will trigger a primary failover on your Atlas cluster. The cluster will briefly be unavailable during the election.',
    outage_start: `This will start an outage simulation for ${outageProvider} / ${outageRegion}. Nodes in that region will be taken offline.`,
    outage_end: 'This will end the active outage simulation and restore all affected nodes.',
    reset:
      'This will delete ALL documents from the resilience_events collection. This action cannot be undone.',
  };

  return (
    <div className="p-3 space-y-3">
      <span className="text-xs font-semibold font-display text-gray-400 uppercase tracking-wider">
        Scenarios
      </span>

      {/* Workloads */}
      <div className="space-y-1.5">
        <p className="text-xs text-gray-600 uppercase tracking-widest font-display">
          Workloads
        </p>
        <button
          className={btnGreen}
          disabled={isRunning || loading}
          onClick={() => startWorkload('write')}
        >
          <Play className="w-3 h-3 shrink-0" /> Write Workload
        </button>
        <button
          className={btnGreen}
          disabled={isRunning || loading}
          onClick={() => startWorkload('read')}
        >
          <Play className="w-3 h-3 shrink-0" /> Read Workload
        </button>
        <button
          className={btnGreen}
          disabled={isRunning || loading}
          onClick={() => startWorkload('mixed')}
        >
          <Play className="w-3 h-3 shrink-0" /> Mixed Read/Write
        </button>
        <button
          className={btnGreen}
          disabled={isRunning || loading}
          onClick={() => startWorkload('update')}
        >
          <Play className="w-3 h-3 shrink-0" /> Update Workload
        </button>
        <button
          className={btnGreen}
          disabled={isRunning || loading}
          onClick={() => startWorkload('bulk')}
        >
          <Play className="w-3 h-3 shrink-0" /> Bulk Write
        </button>
        <button
          className={btnGray}
          disabled={!isRunning || loading}
          onClick={stopWorkload}
        >
          <Square className="w-3 h-3 shrink-0" /> Stop Workload
        </button>
      </div>

      {/* Atlas Control Plane */}
      <div className="space-y-1.5 border-t border-gray-800 pt-2">
        <p className="text-xs text-gray-600 uppercase tracking-widest font-display">
          Atlas Control Plane
        </p>

        {!atlasEnabled && (
          <div className="text-xs text-yellow-700 bg-yellow-950/50 border border-yellow-900/40 rounded p-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-yellow-600" />
            <span>
              Atlas control plane disabled.{' '}
              <span className="font-mono">ENABLE_ATLAS_CONTROL_PLANE=true</span> to enable.
            </span>
          </div>
        )}

        <button
          className={btnOrange}
          disabled={!atlasEnabled || !destructiveEnabled || loading}
          onClick={() => setConfirm({ action: 'failover' })}
          title={
            !atlasEnabled
              ? 'Atlas control plane disabled'
              : !destructiveEnabled
              ? 'Set ENABLE_DESTRUCTIVE_ACTIONS=true'
              : 'Trigger primary failover'
          }
        >
          <Zap className="w-3 h-3 shrink-0" /> Trigger Failover
        </button>

        {!destructiveEnabled && atlasEnabled && (
          <p className="text-xs text-gray-600">
            Failover &amp; outage require{' '}
            <span className="font-mono">ENABLE_DESTRUCTIVE_ACTIONS=true</span>
          </p>
        )}

        {/* Outage region inputs */}
        <div className="flex gap-1">
          <input
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-mdb-green/50 font-mono"
            placeholder="Provider"
            value={outageProvider}
            onChange={(e) => setOutageProvider(e.target.value)}
          />
          <input
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-mdb-green/50 font-mono"
            placeholder="Region"
            value={outageRegion}
            onChange={(e) => setOutageRegion(e.target.value)}
          />
        </div>

        <button
          className={btnRed}
          disabled={!atlasEnabled || !destructiveEnabled || loading}
          onClick={() => setConfirm({ action: 'outage_start' })}
        >
          <ShieldOff className="w-3 h-3 shrink-0" /> Start Outage Simulation
        </button>
        <button
          className={btnGray}
          disabled={!atlasEnabled || loading}
          onClick={() => setConfirm({ action: 'outage_end' })}
        >
          <Globe className="w-3 h-3 shrink-0" /> End Outage Simulation
        </button>
      </div>

      {/* Demo reset */}
      <div className="border-t border-gray-800 pt-2">
        <button
          className={btnGray}
          disabled={loading || !destructiveEnabled}
          onClick={() => setConfirm({ action: 'reset' })}
          title={
            !destructiveEnabled
              ? 'Set ENABLE_DESTRUCTIVE_ACTIONS=true to reset'
              : 'Delete all demo data'
          }
        >
          <RotateCcw className="w-3 h-3 shrink-0" /> Reset Demo Dataset
        </button>
      </div>

      {/* Confirmation modal */}
      {confirm.action && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="font-semibold font-display">Confirm Action</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {CONFIRM_COPY[confirm.action]}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={() => setConfirm({ action: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                onClick={() => {
                  if (confirm.action === 'failover') triggerFailover();
                  else if (confirm.action === 'outage_start') startOutage();
                  else if (confirm.action === 'outage_end') endOutage();
                  else if (confirm.action === 'reset') resetDemo();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
