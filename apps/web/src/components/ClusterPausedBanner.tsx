import { useState } from 'react';
import { PauseCircle, Play } from 'lucide-react';
import type { ApiResponse } from '@atlas-demo/shared';

interface Props {
  paused: boolean;
  controlPlaneEnabled: boolean;
  onResume: () => Promise<ApiResponse<void>>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshStart: () => void;
}

export default function ClusterPausedBanner({
  paused,
  controlPlaneEnabled,
  onResume,
  onToast,
  onRefreshStart,
}: Props) {
  const [resuming, setResuming] = useState(false);

  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await onResume();
      if (res.success) {
        onRefreshStart();
        onToast('Resume initiated — cluster will be ready in ~2 minutes', 'info');
      } else {
        onToast(res.error ?? 'Failed to resume cluster', 'error');
      }
    } finally {
      setResuming(false);
    }
  };

  return (
    // max-h transition: animates in/out without reflow
    <div
      className={`shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        paused ? 'max-h-14 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-amber-500/[0.06] border-b border-amber-500/[0.12]">

        {/* Ambient glow — fixed, pointer-events-none, no scroll repaint */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/3 w-72 h-20 bg-amber-400/[0.07] rounded-full blur-3xl -translate-y-1/2" />
        </div>

        {/* Left: icon + copy */}
        <div className="relative flex items-center gap-3">
          {/* Double-bezel icon (Doppelrand) */}
          <div className="p-px rounded-lg bg-gradient-to-b from-amber-400/[0.22] to-amber-400/[0.05] ring-1 ring-amber-400/[0.14]">
            <div className="w-6 h-6 rounded-[calc(0.5rem-1px)] bg-amber-500/[0.10] flex items-center justify-center shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]">
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-display font-semibold text-amber-300 uppercase tracking-[0.16em]">
              Cluster Paused
            </span>
            <span className="w-px h-3 bg-amber-500/25" />
            <span className="text-xs text-amber-600/80 font-mono hidden sm:inline">
              All workload operations will fail — resume the cluster to continue
            </span>
          </div>
        </div>

        {/* Right: pulse dot + resume CTA */}
        <div className="relative flex items-center gap-3">
          <span className="relative flex w-2 h-2 shrink-0">
            <span className="animate-ping absolute inset-0 rounded-full bg-amber-400 opacity-50" />
            <span className="relative rounded-full w-2 h-2 bg-amber-400" />
          </span>

          {controlPlaneEnabled && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold
                bg-amber-400/[0.10] border border-amber-400/[0.22] text-amber-300
                hover:bg-amber-400/[0.18] hover:border-amber-400/[0.38] hover:text-amber-200
                active:scale-[0.96] transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resuming ? (
                <span className="w-3 h-3 border border-amber-400/40 border-t-amber-300 rounded-full animate-spin" />
              ) : (
                <Play className="w-3 h-3" strokeWidth={1.75} />
              )}
              {resuming ? 'Resuming…' : 'Resume Cluster'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
