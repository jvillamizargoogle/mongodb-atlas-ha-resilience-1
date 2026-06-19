import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import {
  X, Settings, Eye, EyeOff, CheckCircle2, AlertTriangle,
  RotateCcw, Wifi, Loader2, Database,
} from 'lucide-react';
import { api } from '../api/client';

const LS_URI     = 'ctti_demo_override_uri';
const LS_CLUSTER = 'ctti_demo_override_cluster';

interface ConnectionInfo {
  isOverride: boolean;
  clusterName: string;
  uriHost: string;
}

interface FeedbackState {
  ok: boolean;
  msg: string;
}

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [visible,      setVisible]      = useState(false);
  const [info,         setInfo]         = useState<ConnectionInfo | null>(null);
  const [uri,          setUri]          = useState(localStorage.getItem(LS_URI) ?? '');
  const [clusterInput, setClusterInput] = useState(localStorage.getItem(LS_CLUSTER) ?? '');
  const [showUri,      setShowUri]      = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [applying,     setApplying]     = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [testFb,       setTestFb]       = useState<FeedbackState | null>(null);
  const [applyFb,      setApplyFb]      = useState<FeedbackState | null>(null);

  // Entrance animation
  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  // Fetch current connection info from API
  useEffect(() => {
    api.settingsGetConnection()
      .then(res => { if (res.success && res.data) setInfo(res.data); })
      .catch(() => {});
  }, []);

  function close() { setVisible(false); setTimeout(onClose, 240); }

  function clearFeedback() { setTestFb(null); setApplyFb(null); }

  async function handleTest() {
    if (!uri.trim()) { setTestFb({ ok: false, msg: 'Enter a MongoDB URI first' }); return; }
    setTesting(true);
    clearFeedback();
    try {
      const res = await api.settingsTestConnection(uri.trim());
      if (res.success && res.data) {
        setTestFb({ ok: true, msg: `Reachable — ${(res.data as { uriHost: string }).uriHost}` });
      } else {
        setTestFb({ ok: false, msg: res.error ?? 'Connection failed' });
      }
    } catch {
      setTestFb({ ok: false, msg: 'Network error' });
    } finally {
      setTesting(false);
    }
  }

  async function handleApply() {
    if (!uri.trim()) { setApplyFb({ ok: false, msg: 'Enter a MongoDB URI first' }); return; }
    setApplying(true);
    clearFeedback();
    try {
      const res = await api.settingsApplyConnection(uri.trim(), clusterInput.trim());
      if (res.success) {
        localStorage.setItem(LS_URI, uri.trim());
        if (clusterInput.trim()) localStorage.setItem(LS_CLUSTER, clusterInput.trim());
        else localStorage.removeItem(LS_CLUSTER);
        setApplyFb({ ok: true, msg: 'Connection applied — workload stopped, driver reconnected' });
        const infoRes = await api.settingsGetConnection();
        if (infoRes.success && infoRes.data) setInfo(infoRes.data);
      } else {
        setApplyFb({ ok: false, msg: res.error ?? 'Apply failed' });
      }
    } catch {
      setApplyFb({ ok: false, msg: 'Network error' });
    } finally {
      setApplying(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    clearFeedback();
    try {
      const res = await api.settingsResetConnection();
      if (res.success) {
        localStorage.removeItem(LS_URI);
        localStorage.removeItem(LS_CLUSTER);
        setUri('');
        setClusterInput('');
        setApplyFb({ ok: true, msg: 'Reset to .env — using original environment values' });
        const infoRes = await api.settingsGetConnection();
        if (infoRes.success && infoRes.data) setInfo(infoRes.data);
      } else {
        setApplyFb({ ok: false, msg: res.error ?? 'Reset failed' });
      }
    } catch {
      setApplyFb({ ok: false, msg: 'Network error' });
    } finally {
      setResetting(false);
    }
  }

  const busy   = testing || applying || resetting;
  const SPRING = 'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]';
  const fb     = applyFb ?? testFb;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.78 : 0})`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background-color 240ms ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        style={{
          transition: 'opacity 240ms cubic-bezier(0.32,0.72,0,1), transform 240ms cubic-bezier(0.32,0.72,0,1)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        }}
        className="w-full max-w-lg relative"
      >
        {/* Ambient glow */}
        <div className="absolute inset-4 -z-10 rounded-2xl blur-3xl bg-mdb-green/[0.04]" />

        {/* Double-bezel shell */}
        <div className="p-px rounded-2xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] ring-1 ring-white/[0.08] shadow-2xl">
          <div className="bg-[#0d0d12] rounded-[calc(1rem-1px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-mdb-green/[0.10] ring-1 ring-mdb-green/[0.20] shadow-[0_0_18px_rgba(0,237,100,0.10)]">
                  <Settings className="w-4 h-4 text-mdb-green" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-display text-white tracking-tight">
                    Connection Settings
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Override MongoDB URI and cluster without restarting the app
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-200 hover:bg-white/[0.06] transition-all duration-150 active:scale-[0.92] -mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Current connection card ── */}
              {info && (
                <div className="space-y-1.5">
                  <p className="text-[13px] font-mono font-semibold text-gray-600 uppercase tracking-[0.14em]">
                    Active Connection
                  </p>
                  <div className="p-px rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent ring-1 ring-white/[0.07]">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-[calc(0.75rem-1px)] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <Database className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-mono text-white/90 truncate">{info.uriHost}</p>
                        {info.clusterName && (
                          <p className="text-xs text-gray-600 font-mono mt-0.5 truncate">
                            cluster: {info.clusterName}
                          </p>
                        )}
                      </div>
                      <span className={[
                        'shrink-0 text-xs font-mono font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider',
                        info.isOverride
                          ? 'text-orange-400 border-orange-500/25 bg-orange-500/[0.08]'
                          : 'text-mdb-green border-mdb-green/20 bg-mdb-green/[0.06]',
                      ].join(' ')}>
                        {info.isOverride ? 'Override' : 'ENV'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Override inputs ── */}
              <div className="space-y-3">
                <p className="text-[13px] font-mono font-semibold text-gray-600 uppercase tracking-[0.14em]">
                  {info?.isOverride ? 'Modify Override' : 'Set Override'}
                </p>

                {/* URI */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-mono">MongoDB URI</label>
                  <div className="relative">
                    <input
                      type={showUri ? 'text' : 'password'}
                      value={uri}
                      onChange={e => { setUri(e.target.value); clearFeedback(); }}
                      placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-10 text-[13px] text-gray-200 placeholder-gray-700 font-mono focus:outline-none focus:border-mdb-green/30 focus:ring-1 focus:ring-mdb-green/[0.12] transition-all duration-200 disabled:opacity-50 shadow-[inset_0_1px_0_rgba(0,0,0,0.3)]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowUri(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-600 hover:text-gray-300 transition-colors duration-150"
                    >
                      {showUri ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Cluster name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-mono">Atlas Cluster Name</label>
                  <input
                    type="text"
                    value={clusterInput}
                    onChange={e => { setClusterInput(e.target.value); clearFeedback(); }}
                    placeholder="e.g. Cluster0"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-gray-200 placeholder-gray-700 font-mono focus:outline-none focus:border-mdb-green/30 focus:ring-1 focus:ring-mdb-green/[0.12] transition-all duration-200 disabled:opacity-50 shadow-[inset_0_1px_0_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>

              {/* ── Info note ── */}
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-yellow-500/[0.05] border border-yellow-500/[0.12]">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500/60 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-600/70 leading-snug">
                  Applying will stop any running workload and reconnect the driver.
                  The override persists in the browser but is cleared on API restart.
                </p>
              </div>

              {/* ── Feedback ── */}
              {fb && (
                <div className={[
                  'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border',
                  fb.ok
                    ? 'bg-mdb-green/[0.06] border-mdb-green/[0.18]'
                    : 'bg-red-500/[0.07] border-red-500/[0.20]',
                ].join(' ')}>
                  {fb.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-mdb-green shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                  <p className={`text-[13px] font-mono leading-snug ${fb.ok ? 'text-mdb-green/90' : 'text-red-400/90'}`}>
                    {fb.msg}
                  </p>
                </div>
              )}

            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05] bg-white/[0.01]">
              {/* Reset */}
              <button
                onClick={handleReset}
                disabled={busy || !info?.isOverride}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg ${SPRING} disabled:opacity-30 disabled:cursor-not-allowed bg-white/[0.04] text-gray-400 border border-white/[0.07] hover:bg-white/[0.08] hover:text-gray-200 hover:border-white/[0.13]`}
              >
                {resetting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />}
                Reset to .env
              </button>

              {/* Test + Apply */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTest}
                  disabled={busy || !uri.trim()}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg ${SPRING} disabled:opacity-30 disabled:cursor-not-allowed bg-white/[0.05] text-gray-300 border border-white/[0.09] hover:bg-white/[0.09] hover:border-white/[0.16] hover:-translate-y-px`}
                >
                  {testing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Wifi className="w-3.5 h-3.5" />}
                  Test
                </button>
                <button
                  onClick={handleApply}
                  disabled={busy || !uri.trim()}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold font-display rounded-lg ${SPRING} disabled:opacity-30 disabled:cursor-not-allowed bg-mdb-green/[0.14] text-mdb-green border border-mdb-green/[0.28] hover:bg-mdb-green/[0.22] hover:border-mdb-green/50 hover:-translate-y-px shadow-[0_0_14px_rgba(0,237,100,0.07)]`}
                >
                  {applying
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Apply
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Restore any saved connection override on app startup.
// Call this once at the top level (outside React) so it fires before components mount.
export function restoreConnectionOverride(): void {
  const savedUri     = localStorage.getItem(LS_URI);
  const savedCluster = localStorage.getItem(LS_CLUSTER);
  if (!savedUri) return;
  api.settingsApplyConnection(savedUri, savedCluster ?? '').catch(() => {
    // If the override fails to apply (e.g. API not yet ready or URI invalid),
    // clear it from localStorage so the user isn't stuck on a bad URI.
    localStorage.removeItem(LS_URI);
    localStorage.removeItem(LS_CLUSTER);
  });
}
