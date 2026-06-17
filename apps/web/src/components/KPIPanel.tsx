import { useCallback, useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { MetricsSnapshot } from '@atlas-demo/shared';
import KPIModal, { type KPIMetricConfig } from './KPIModal';

interface Props {
  metrics: MetricsSnapshot | null;
}

interface DataPoint { v: number; }

// Metric configs for the expanded modal view
const METRIC_CONFIGS: Record<string, KPIMetricConfig> = {
  writes:    { label: 'Writes / s',      unit: '',   chartColor: '#00ED64', gradientId: 'kpi-modal-writes'  },
  reads:     { label: 'Reads / s',       unit: '',   chartColor: '#60a5fa', gradientId: 'kpi-modal-reads'   },
  updates:   { label: 'Updates / s',     unit: '',   chartColor: '#facc15', gradientId: 'kpi-modal-updates' },
  latency:   { label: 'ACK Latency',     unit: 'ms', chartColor: '#f97316', gradientId: 'kpi-modal-lat'     },
  p50:       { label: 'P50 Latency',     unit: 'ms', chartColor: '#a78bfa', gradientId: 'kpi-modal-p50'     },
  p95:       { label: 'P95 Latency',     unit: 'ms', chartColor: '#fb923c', gradientId: 'kpi-modal-p95'     },
  p99:       { label: 'P99 Latency',     unit: 'ms', chartColor: '#f43f5e', gradientId: 'kpi-modal-p99'     },
  errorRate: { label: 'Error Rate',      unit: '%',  chartColor: '#ef4444', gradientId: 'kpi-modal-err'     },
};

const MAX_HISTORY = 60;

function KPITile({
  label,
  value,
  unit = '',
  valueColor = 'text-white',
  history,
  chartColor,
  sub,
  onClick,
}: {
  label: string;
  value: string | number;
  unit?: string;
  valueColor?: string;
  history?: DataPoint[];
  chartColor?: string;
  sub?: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`p-px rounded-lg bg-gradient-to-b from-white/[0.07] to-transparent ring-1 ring-white/[0.05] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        clickable
          ? 'cursor-pointer hover:ring-white/[0.12] hover:from-white/[0.10] active:scale-[0.97]'
          : ''
      }`}
    >
      {/* Inner core */}
      <div className={`relative bg-[#0c0c10] rounded-[calc(0.5rem-1px)] px-3 py-2.5 min-w-0 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 ${
        clickable ? 'hover:bg-[#0f0f14]' : ''
      }`}>
        {/* Sparkline backdrop */}
        {history && history.length > 2 && (
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={chartColor ?? '#00ED64'}
                  fill={chartColor ?? '#00ED64'}
                  dot={false}
                  strokeWidth={1}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="relative z-10">
          <p className="text-[9px] font-display uppercase tracking-[0.12em] text-gray-500 leading-tight mb-1 whitespace-nowrap">
            {label}
          </p>
          <p className={`text-lg font-bold font-display leading-none tabular-nums ${valueColor}`}>
            {value}
            {unit && (
              <span className="text-[10px] font-normal text-gray-600 ml-0.5">{unit}</span>
            )}
          </p>
          {sub && (
            <p className="text-[9px] text-gray-700 mt-0.5 font-mono truncate">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KPIPanel({ metrics }: Props) {
  const [histW,   setHistW]   = useState<DataPoint[]>([]);
  const [histR,   setHistR]   = useState<DataPoint[]>([]);
  const [histU,   setHistU]   = useState<DataPoint[]>([]);
  const [histL,   setHistL]   = useState<DataPoint[]>([]);
  const [histP50, setHistP50] = useState<DataPoint[]>([]);
  const [histP95, setHistP95] = useState<DataPoint[]>([]);
  const [histP99, setHistP99] = useState<DataPoint[]>([]);
  const [histE,   setHistE]   = useState<DataPoint[]>([]);

  const [activeModal,   setActiveModal]   = useState<string | null>(null);
  const [modalValue,    setModalValue]    = useState<string | number>('');
  const [modalHistory,  setModalHistory]  = useState<DataPoint[]>([]);

  const closeModal = useCallback(() => setActiveModal(null), []);

  useEffect(() => {
    if (!metrics) return;
    const push = (h: DataPoint[], v: number): DataPoint[] => [...h, { v }].slice(-MAX_HISTORY);
    setHistW(  h => push(h, metrics.writesPerSec));
    setHistR(  h => push(h, metrics.readsPerSec));
    setHistU(  h => push(h, metrics.updatesPerSec));
    setHistL(  h => push(h, metrics.avgAckLatencyMs));
    setHistP50(h => push(h, metrics.p50LatencyMs));
    setHistP95(h => push(h, metrics.p95LatencyMs));
    setHistP99(h => push(h, metrics.p99LatencyMs));
    setHistE(  h => push(h, metrics.errorRate * 100));
  }, [metrics]);

  // Keep modal history in sync with the live source when modal is open
  useEffect(() => {
    if (!activeModal) return;
    const map: Record<string, DataPoint[]> = {
      writes: histW, reads: histR, updates: histU, latency: histL,
      p50: histP50, p95: histP95, p99: histP99, errorRate: histE,
    };
    setModalHistory(map[activeModal] ?? []);
  }, [activeModal, histW, histR, histU, histL, histP50, histP95, histP99, histE]);

  const openModal = useCallback((key: string, displayValue: string | number) => {
    setActiveModal(key);
    setModalValue(displayValue);
  }, []);

  const fmt    = (n: number, d = 1) => n.toFixed(d);
  const fmtMs  = (n: number) => (n < 1 ? '<1' : Math.round(n).toString());

  const fmtRelative = (iso: string) => {
    const diffS = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffS < 60) return `${diffS}s ago`;
    if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`;
    return `${Math.floor(diffS / 3600)}h ago`;
  };

  const errorPct   = (metrics?.errorRate  ?? 0) * 100;
  const failedOps  =  metrics?.failedOps  ?? 0;
  const avgLatency =  metrics?.avgAckLatencyMs ?? 0;
  const p95        =  metrics?.p95LatencyMs    ?? 0;
  const p99        =  metrics?.p99LatencyMs    ?? 0;

  return (
    <>
      <div className="px-3 py-2.5 bg-[#080809] border-t border-white/[0.05]">
        <div className="grid grid-cols-6 xl:grid-cols-12 gap-1.5">
          <KPITile
            label="Writes/s"
            value={fmt(metrics?.writesPerSec ?? 0)}
            valueColor="text-mdb-green"
            history={histW}
            chartColor="#00ED64"
            onClick={() => openModal('writes', fmt(metrics?.writesPerSec ?? 0))}
          />
          <KPITile
            label="Reads/s"
            value={fmt(metrics?.readsPerSec ?? 0)}
            valueColor="text-blue-400"
            history={histR}
            chartColor="#60a5fa"
            onClick={() => openModal('reads', fmt(metrics?.readsPerSec ?? 0))}
          />
          <KPITile
            label="Updates/s"
            value={fmt(metrics?.updatesPerSec ?? 0)}
            valueColor="text-yellow-400"
            history={histU}
            chartColor="#facc15"
            onClick={() => openModal('updates', fmt(metrics?.updatesPerSec ?? 0))}
          />
          <KPITile
            label="ACK Lat"
            value={fmtMs(avgLatency)}
            unit="ms"
            valueColor={avgLatency > 200 ? 'text-red-400' : avgLatency > 100 ? 'text-orange-400' : 'text-mdb-green'}
            history={histL}
            chartColor="#f97316"
            onClick={() => openModal('latency', fmtMs(avgLatency))}
          />
          <KPITile
            label="P50"
            value={fmtMs(metrics?.p50LatencyMs ?? 0)}
            unit="ms"
            valueColor="text-gray-200"
            history={histP50}
            chartColor="#a78bfa"
            onClick={() => openModal('p50', fmtMs(metrics?.p50LatencyMs ?? 0))}
          />
          <KPITile
            label="P95"
            value={fmtMs(p95)}
            unit="ms"
            valueColor={p95 > 500 ? 'text-red-400' : p95 > 200 ? 'text-orange-400' : 'text-gray-200'}
            history={histP95}
            chartColor="#fb923c"
            onClick={() => openModal('p95', fmtMs(p95))}
          />
          <KPITile
            label="P99"
            value={fmtMs(p99)}
            unit="ms"
            valueColor={p99 > 1000 ? 'text-red-400' : 'text-gray-200'}
            history={histP99}
            chartColor="#f43f5e"
            onClick={() => openModal('p99', fmtMs(p99))}
          />
          <KPITile
            label="Error %"
            value={fmt(errorPct, 1)}
            unit="%"
            valueColor={errorPct > 10 ? 'text-red-400' : errorPct > 2 ? 'text-orange-400' : 'text-gray-400'}
            history={histE}
            chartColor="#ef4444"
            onClick={() => openModal('errorRate', fmt(errorPct, 1))}
          />
          <KPITile
            label="Retries"
            value={metrics?.retryCount ?? 0}
            valueColor="text-yellow-400"
          />
          <KPITile
            label="Success"
            value={(metrics?.successfulOps ?? 0).toLocaleString()}
            valueColor="text-mdb-green"
          />
          <KPITile
            label="Failed"
            value={failedOps.toLocaleString()}
            valueColor={failedOps > 0 ? 'text-red-400' : 'text-gray-600'}
          />
          <KPITile
            label="Failover"
            value={metrics?.lastFailoverTime ? fmtRelative(metrics.lastFailoverTime) : '—'}
            valueColor="text-orange-400"
            sub={`uptime ${metrics?.uptime ?? 0}s`}
          />
        </div>
      </div>

      {activeModal && METRIC_CONFIGS[activeModal] && (
        <KPIModal
          isOpen={!!activeModal}
          metric={METRIC_CONFIGS[activeModal]}
          history={modalHistory}
          currentValue={modalValue}
          onClose={closeModal}
        />
      )}
    </>
  );
}
