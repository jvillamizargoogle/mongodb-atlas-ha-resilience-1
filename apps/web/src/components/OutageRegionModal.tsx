import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { X, ShieldOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Region {
  provider: string;
  region: string;
  priority: number;
  nodeCount: number;
}

interface Props {
  regions: Region[];
  onConfirm: (provider: string, region: string) => void;
  onClose: () => void;
}

const PTOK: Record<string, { label: string; text: string; dot: string }> = {
  AWS:   { label: 'AWS',   text: 'text-orange-400', dot: 'bg-orange-400' },
  GCP:   { label: 'GCP',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
  AZURE: { label: 'Azure', text: 'text-sky-400',    dot: 'bg-sky-400'    },
};
function ptok(p: string) {
  return PTOK[p.toUpperCase()] ?? { label: p, text: 'text-gray-400', dot: 'bg-gray-400' };
}
function fmtRegion(r: string) { return r.toLowerCase().replace(/_/g, '-'); }

export default function OutageRegionModal({ regions, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(0);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  function close() { setVisible(false); setTimeout(onClose, 240); }

  function confirm() {
    const r = regions[selected];
    if (r) onConfirm(r.provider, r.region);
  }

  const totalNodes     = regions.reduce((s, r) => s + r.nodeCount, 0);
  const isolatedNodes  = regions[selected]?.nodeCount ?? 0;
  const remainingNodes = totalNodes - isolatedNodes;
  const quorumOk       = totalNodes > 0 && remainingNodes > totalNodes / 2;
  const maxPriority    = regions.length > 0 ? Math.max(...regions.map(r => r.priority)) : 0;

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
        {/* Ambient glow behind the shell */}
        <div className="absolute inset-4 -z-10 rounded-2xl blur-3xl bg-red-500/[0.07]" />

        {/* Double-bezel shell */}
        <div className="p-px rounded-2xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] ring-1 ring-white/[0.08] shadow-2xl">
          <div className="bg-[#0d0d12] rounded-[calc(1rem-1px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/[0.10] ring-1 ring-red-500/[0.22] shadow-[0_0_18px_rgba(239,68,68,0.14)]">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-display text-white tracking-tight">
                    Simulate Regional Outage
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    Select the cloud region to isolate from the replica set
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

            {/* ── Column headers ── */}
            <div className="px-6 pt-3 pb-1.5">
              <div className="grid grid-cols-[20px_72px_1fr_48px] gap-3">
                <div />
                <span className="text-[9px] font-mono font-semibold text-gray-600 uppercase tracking-[0.12em]">Provider</span>
                <span className="text-[9px] font-mono font-semibold text-gray-600 uppercase tracking-[0.12em]">Region</span>
                <span className="text-[9px] font-mono font-semibold text-gray-600 uppercase tracking-[0.12em] text-right">Nodes</span>
              </div>
            </div>

            {/* ── Region cards ── */}
            <div className="px-5 pb-3 space-y-1.5">
              {regions.map((r, i) => {
                const pt  = ptok(r.provider);
                const sel = i === selected;
                const isPrimary = r.priority === maxPriority;

                return (
                  <button
                    key={`${r.provider}||${r.region}`}
                    onClick={() => setSelected(i)}
                    className={[
                      'w-full text-left rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]',
                      sel
                        ? 'p-px bg-gradient-to-b from-red-500/[0.24] to-red-500/[0.06] ring-1 ring-red-500/[0.40] shadow-[0_0_22px_rgba(239,68,68,0.16)]'
                        : 'p-px bg-gradient-to-b from-white/[0.06] to-transparent ring-1 ring-white/[0.06] hover:ring-white/[0.13]',
                    ].join(' ')}
                  >
                    <div className={[
                      'flex items-center gap-3 px-3.5 py-3 rounded-[calc(0.75rem-1px)]',
                      'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200',
                      sel ? 'bg-red-500/[0.06]' : 'bg-white/[0.015] hover:bg-white/[0.035]',
                    ].join(' ')}>

                      {/* Radio indicator */}
                      <div className={[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                        sel ? 'border-red-400 bg-red-400/[0.10]' : 'border-gray-700',
                      ].join(' ')}>
                        {sel && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      </div>

                      {/* Content grid: provider | region | nodes */}
                      <div className="flex-1 grid grid-cols-[72px_1fr_48px] gap-3 items-center min-w-0">

                        {/* Provider badge */}
                        <div className={`flex items-center gap-1.5 ${pt.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pt.dot}`} />
                          <span className="text-[11px] font-mono font-semibold leading-none">{pt.label}</span>
                        </div>

                        {/* Region + primary tag */}
                        <div className="min-w-0 flex items-center gap-2">
                          <span className={`text-[11px] font-mono truncate ${sel ? 'text-white' : 'text-gray-300'}`}>
                            {fmtRegion(r.region)}
                          </span>
                          {isPrimary && (
                            <span className="shrink-0 text-[8px] font-mono text-yellow-500/70 border border-yellow-500/[0.22] rounded px-1 py-px leading-none uppercase tracking-wider">
                              Primary
                            </span>
                          )}
                        </div>

                        {/* Node count */}
                        <div className="text-right">
                          <span className={`text-[11px] font-mono tabular-nums ${sel ? 'text-red-300/90' : 'text-gray-500'}`}>
                            {r.nodeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Quorum analysis ── */}
            <div className="px-5 pb-4">
              <div className={[
                'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-300',
                quorumOk
                  ? 'bg-mdb-green/[0.06] border-mdb-green/[0.18]'
                  : 'bg-red-500/[0.08] border-red-500/[0.22]',
              ].join(' ')}>
                {quorumOk
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-mdb-green shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                <div className="space-y-0.5">
                  <p className={`text-[11px] font-medium leading-snug ${quorumOk ? 'text-mdb-green/90' : 'text-red-400/90'}`}>
                    {quorumOk
                      ? `Majority quorum maintained — ${remainingNodes} of ${totalNodes} electable nodes remain`
                      : `Quorum will be lost — only ${remainingNodes} of ${totalNodes} electable nodes remain`}
                  </p>
                  <p className="text-[10px] text-gray-600 leading-snug">
                    {quorumOk
                      ? 'A new primary will be elected and the cluster will remain writable.'
                      : 'The replica set will lose its primary and become read-only until the outage ends.'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05] bg-white/[0.01]">
              <button
                onClick={close}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] bg-white/[0.05] text-gray-400 border border-white/[0.08] hover:bg-white/[0.09] hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="flex items-center gap-2 px-5 py-1.5 text-xs font-semibold font-display rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] hover:-translate-y-px bg-red-500/[0.15] text-red-300 border border-red-500/[0.35] hover:bg-red-500/[0.22] hover:border-red-500/60 shadow-[0_0_16px_rgba(239,68,68,0.10)]"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Simulate Outage
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
