import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { MetricsSnapshot } from '@atlas-demo/shared';

interface Props {
  metrics: MetricsSnapshot | null;
}

interface DataPoint {
  v: number;
}

function KPITile({
  label,
  value,
  unit = '',
  valueColor = 'text-white',
  history,
  chartColor,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  valueColor?: string;
  history?: DataPoint[];
  chartColor?: string;
  sub?: string;
}) {
  return (
    <div className="relative bg-gray-900 border border-gray-800 rounded-lg p-3 min-w-0 overflow-hidden">
      {/* Sparkline backdrop */}
      {history && history.length > 2 && (
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={chartColor ?? '#00ED64'}
                fill={chartColor ?? '#00ED64'}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative z-10">
        <p className="text-xs text-gray-500 truncate mb-0.5 font-display uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-xl font-bold font-display leading-none ${valueColor}`}>
          {value}
          {unit && (
            <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
          )}
        </p>
        {sub && <p className="text-xs text-gray-600 truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function KPIPanel({ metrics }: Props) {
  const [histW, setHistW] = useState<DataPoint[]>([]);
  const [histR, setHistR] = useState<DataPoint[]>([]);
  const [histL, setHistL] = useState<DataPoint[]>([]);
  const [histE, setHistE] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!metrics) return;
    setHistW((h) => [...h, { v: metrics.writesPerSec }].slice(-40));
    setHistR((h) => [...h, { v: metrics.readsPerSec }].slice(-40));
    setHistL((h) => [...h, { v: metrics.avgAckLatencyMs }].slice(-40));
    setHistE((h) => [...h, { v: metrics.errorRate * 100 }].slice(-40));
  }, [metrics]);

  const fmt = (n: number, d = 1) => n.toFixed(d);
  const fmtMs = (n: number) => (n < 1 ? '<1' : Math.round(n).toString());

  const errorPct = (metrics?.errorRate ?? 0) * 100;
  const failedOps = metrics?.failedOps ?? 0;
  const avgLatency = metrics?.avgAckLatencyMs ?? 0;
  const p95 = metrics?.p95LatencyMs ?? 0;

  return (
    <div className="p-3 bg-gray-950 border-t border-gray-800">
      <div className="grid grid-cols-6 xl:grid-cols-12 gap-2">
        <KPITile
          label="Writes/sec"
          value={fmt(metrics?.writesPerSec ?? 0)}
          valueColor="text-mdb-green"
          history={histW}
          chartColor="#00ED64"
        />
        <KPITile
          label="Reads/sec"
          value={fmt(metrics?.readsPerSec ?? 0)}
          valueColor="text-blue-400"
          history={histR}
          chartColor="#60a5fa"
        />
        <KPITile
          label="Updates/sec"
          value={fmt(metrics?.updatesPerSec ?? 0)}
          valueColor="text-yellow-400"
        />
        <KPITile
          label="ACK Latency"
          value={fmtMs(avgLatency)}
          unit="ms"
          valueColor={avgLatency > 200 ? 'text-red-400' : avgLatency > 100 ? 'text-orange-400' : 'text-mdb-green'}
          history={histL}
          chartColor="#f97316"
        />
        <KPITile
          label="p50 Latency"
          value={fmtMs(metrics?.p50LatencyMs ?? 0)}
          unit="ms"
          valueColor="text-gray-200"
        />
        <KPITile
          label="p95 Latency"
          value={fmtMs(p95)}
          unit="ms"
          valueColor={p95 > 500 ? 'text-red-400' : p95 > 200 ? 'text-orange-400' : 'text-gray-200'}
        />
        <KPITile
          label="p99 Latency"
          value={fmtMs(metrics?.p99LatencyMs ?? 0)}
          unit="ms"
          valueColor={(metrics?.p99LatencyMs ?? 0) > 1000 ? 'text-red-400' : 'text-gray-200'}
        />
        <KPITile
          label="Error Rate"
          value={fmt(errorPct, 1)}
          unit="%"
          valueColor={errorPct > 10 ? 'text-red-400' : errorPct > 2 ? 'text-orange-400' : 'text-gray-200'}
          history={histE}
          chartColor="#ef4444"
        />
        <KPITile
          label="Retries"
          value={metrics?.retryCount ?? 0}
          valueColor="text-yellow-400"
        />
        <KPITile
          label="Success Ops"
          value={(metrics?.successfulOps ?? 0).toLocaleString()}
          valueColor="text-mdb-green"
        />
        <KPITile
          label="Failed Ops"
          value={failedOps.toLocaleString()}
          valueColor={failedOps > 0 ? 'text-red-400' : 'text-gray-500'}
        />
        <KPITile
          label="Last Failover"
          value={
            metrics?.lastFailoverTime
              ? new Date(metrics.lastFailoverTime).toLocaleTimeString()
              : '—'
          }
          valueColor="text-orange-400"
          sub={`Uptime ${metrics?.uptime ?? 0}s`}
        />
      </div>
    </div>
  );
}
