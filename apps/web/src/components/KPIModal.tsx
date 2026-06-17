import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { X } from 'lucide-react';

interface DataPoint { v: number; }

export interface KPIMetricConfig {
  label: string;
  unit: string;
  chartColor: string;
  gradientId: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
}

function GlassTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-px rounded-lg bg-gradient-to-b from-white/[0.12] to-white/[0.03] ring-1 ring-white/[0.10]">
      <div className="bg-[#0f0f14]/95 rounded-[calc(0.5rem-1px)] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <span className="text-[11px] font-mono text-gray-200 tabular-nums">{payload[0].value.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  metric: KPIMetricConfig;
  history: DataPoint[];
  currentValue: string | number;
  onClose: () => void;
}

export default function KPIModal({ isOpen, metric, history, currentValue, onClose }: Props) {
  const [mounted,  setMounted]  = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const outer = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(outer);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const vals = history.map(d => d.v);
  const min  = vals.length ? Math.min(...vals) : 0;
  const max  = vals.length ? Math.max(...vals) : 0;
  const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  const chartData = history.map((d, i) => ({ v: d.v, t: i }));

  const SPRING = 'transition-all duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]';

  const fmtStat = (n: number) =>
    metric.unit === 'ms'
      ? (n < 1 ? '<1' : Math.round(n).toString())
      : n.toFixed(1);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center px-6 ${SPRING} ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/82 backdrop-blur-2xl"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className={`relative w-full max-w-[840px] ${SPRING} ${
        visible ? 'scale-100 translate-y-0' : 'scale-[0.92] translate-y-6'
      }`}>

        {/* Outer Doppelrand shell */}
        <div className="p-px rounded-[1.75rem] bg-gradient-to-b from-white/[0.14] to-white/[0.02] ring-1 ring-white/[0.09] shadow-[0_48px_120px_rgba(0,0,0,0.85)]">

          {/* Inner core */}
          <div className="relative bg-[#07070a] rounded-[calc(1.75rem-1px)] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">

            {/* Ambient radial glow — top-center, metric color */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${metric.chartColor}20 0%, transparent 58%)`,
              }}
            />

            {/* Subtle bottom chart glow */}
            <div
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${metric.chartColor}08 0%, transparent 100%)`,
              }}
            />

            <div className="relative px-8 pt-8 pb-6">

              {/* ── Header ── */}
              <div className="flex items-start justify-between mb-8">

                {/* Left: eyebrow + value + label */}
                <div className="space-y-3">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] border text-[9px] uppercase tracking-[0.24em] font-semibold"
                    style={{
                      color:       metric.chartColor,
                      borderColor: `${metric.chartColor}38`,
                      background:  `${metric.chartColor}14`,
                    }}
                  >
                    <span
                      className="w-[5px] h-[5px] rounded-full animate-pulse shrink-0"
                      style={{ background: metric.chartColor }}
                    />
                    Live
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[3.5rem] font-bold font-display tabular-nums leading-none"
                      style={{ color: metric.chartColor }}
                    >
                      {currentValue}
                    </span>
                    {metric.unit && (
                      <span className="text-xl font-normal text-gray-600 font-display">{metric.unit}</span>
                    )}
                  </div>

                  <p className="text-[10px] font-display uppercase tracking-[0.20em] text-gray-500">
                    {metric.label}
                  </p>
                </div>

                {/* Right: stat chips + close */}
                <div className="flex items-start gap-2 shrink-0">
                  {([
                    { label: 'MIN', v: min },
                    { label: 'AVG', v: avg },
                    { label: 'MAX', v: max },
                  ] as const).map(s => (
                    <div
                      key={s.label}
                      className="p-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent ring-1 ring-white/[0.05]"
                    >
                      <div className="bg-[#0f0f14] rounded-[calc(1rem-1px)] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-w-[64px]">
                        <p className="text-[8px] font-display uppercase tracking-[0.22em] text-gray-600 mb-1.5">
                          {s.label}
                        </p>
                        <p className="text-sm font-bold font-display tabular-nums text-gray-300 flex items-baseline justify-center gap-0.5">
                          <span>{fmtStat(s.v)}</span>
                          {metric.unit && (
                            <span className="text-[9px] font-normal text-gray-600">{metric.unit}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Close — Doppelrand button */}
                  <button
                    onClick={onClose}
                    className="p-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent ring-1 ring-white/[0.05] ml-1 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.90]"
                  >
                    <div className="bg-[#0f0f14] rounded-[calc(1rem-1px)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.04] transition-colors duration-150">
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Chart ── */}
              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={metric.chartColor} stopOpacity={0.38} />
                        <stop offset="65%"  stopColor={metric.chartColor} stopOpacity={0.07} />
                        <stop offset="100%" stopColor={metric.chartColor} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="none"
                      vertical={false}
                    />
                    <XAxis dataKey="t" hide />
                    <YAxis
                      tick={{ fill: '#374151', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                      tickLine={false}
                      axisLine={false}
                      width={38}
                    />
                    <Tooltip
                      content={<GlassTooltip />}
                      cursor={{ stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1 }}
                    />
                    {avg > 0 && (
                      <ReferenceLine
                        y={avg}
                        stroke={`${metric.chartColor}42`}
                        strokeDasharray="3 5"
                        strokeWidth={1}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={metric.chartColor}
                      strokeWidth={1.5}
                      fill={`url(#${metric.gradientId})`}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* ── Footer legend ── */}
              <div className="flex items-center justify-between mt-3.5">
                <p className="text-[9px] font-mono text-gray-700 tabular-nums">
                  {history.length} samples · rolling window
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-4 h-[1.5px] rounded-full"
                      style={{ background: metric.chartColor }}
                    />
                    <p className="text-[9px] font-mono text-gray-700">current</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-4 h-px"
                      style={{ borderTop: `1px dashed ${metric.chartColor}50` }}
                    />
                    <p className="text-[9px] font-mono text-gray-700">avg</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
