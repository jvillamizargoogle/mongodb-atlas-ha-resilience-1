import { useRef, useEffect, useState } from 'react';
import type { AtlasProcess } from '../hooks/useAtlas';

interface Props {
  processes: AtlasProcess[];
  loading: boolean;
}

type Role = 'PRIMARY' | 'SECONDARY' | 'RECOVERING' | 'OTHER';

function deriveRole(typeName: string): Role {
  if (typeName.includes('PRIMARY')) return 'PRIMARY';
  if (typeName.includes('SECONDARY')) return 'SECONDARY';
  if (typeName === 'RECOVERING') return 'RECOVERING';
  return 'OTHER';
}

// Trim "cluster0-shard-00-00.xxxxx.mongodb.net" → "shard-00-00"
function shortHost(hostname: string): string {
  const parts = hostname.split('.');
  const seg = parts[0] ?? hostname;
  const m = seg.match(/shard-\d{2}-\d{2}$/i);
  return m ? m[0] : seg.slice(-14);
}

const ROLE_STYLE: Record<Role, {
  outer: string;
  inner: string;
  labelColor: string;
  hostColor: string;
  dot: string;
  dotAnim: string;
}> = {
  PRIMARY: {
    outer:      'bg-gradient-to-b from-[#00ed6433] to-[#00ed640a] ring-1 ring-[#00ed6440]',
    inner:      'bg-[#070d08]',
    labelColor: 'text-mdb-green',
    hostColor:  'text-gray-200',
    dot:        'bg-mdb-green',
    dotAnim:    'animate-pulse-fast',
  },
  SECONDARY: {
    outer:      'bg-gradient-to-b from-white/[0.07] to-transparent ring-1 ring-white/[0.06]',
    inner:      'bg-[#0c0c10]',
    labelColor: 'text-gray-400',
    hostColor:  'text-gray-300',
    dot:        'bg-gray-600',
    dotAnim:    '',
  },
  RECOVERING: {
    outer:      'bg-gradient-to-b from-yellow-500/[0.14] to-transparent ring-1 ring-yellow-500/[0.18]',
    inner:      'bg-[#0c0a00]',
    labelColor: 'text-yellow-400',
    hostColor:  'text-yellow-600',
    dot:        'bg-yellow-500',
    dotAnim:    'animate-pulse',
  },
  OTHER: {
    outer:      'bg-gradient-to-b from-white/[0.03] to-transparent ring-1 ring-white/[0.03]',
    inner:      'bg-[#0c0c10]',
    labelColor: 'text-gray-600',
    hostColor:  'text-gray-600',
    dot:        'bg-gray-800',
    dotAnim:    '',
  },
};

function NodeCard({
  process,
  isNewPrimary,
  enterDelay,
}: {
  process: AtlasProcess;
  isNewPrimary: boolean;
  enterDelay: number;
}) {
  const role = deriveRole(process.typeName);
  const style = ROLE_STYLE[role];
  const host = shortHost(process.hostname);

  return (
    <div
      className={`node-enter p-px rounded-xl ${style.outer}`}
      style={{ animationDelay: `${enterDelay}ms` }}
    >
      <div
        className={`${style.inner} rounded-[calc(0.75rem-1px)] px-2.5 py-2 ${isNewPrimary ? 'new-primary-flash' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-[9px] font-mono font-semibold uppercase tracking-[0.14em] ${style.labelColor}`}
          >
            {role === 'OTHER' ? process.typeName.replace('REPLICA_SET_', '') : role}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${style.dotAnim}`}
          />
        </div>

        <p className={`text-[10px] font-mono truncate leading-tight ${style.hostColor}`}>
          {host}
        </p>
        {process.version && (
          <p className="text-[9px] text-gray-700 font-mono mt-0.5 leading-none">
            v{process.version}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="node-enter p-px rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent ring-1 ring-white/[0.03] animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="bg-[#0c0c10] rounded-[calc(0.75rem-1px)] px-2.5 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-2 w-14 bg-white/[0.05] rounded" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/[0.05]" />
        </div>
        <div className="h-2.5 w-24 bg-white/[0.04] rounded mb-1" />
        <div className="h-2 w-10 bg-white/[0.03] rounded" />
      </div>
    </div>
  );
}

export default function TopologyMap({ processes, loading }: Props) {
  const prevPrimaryIdRef = useRef<string | null>(null);
  const [newPrimaryId, setNewPrimaryId] = useState<string | null>(null);

  const primaryProcess = processes.find((p) => deriveRole(p.typeName) === 'PRIMARY');

  // Detect primary change and trigger flash
  useEffect(() => {
    if (!primaryProcess) return;
    if (prevPrimaryIdRef.current && prevPrimaryIdRef.current !== primaryProcess.id) {
      setNewPrimaryId(primaryProcess.id);
      const t = setTimeout(() => setNewPrimaryId(null), 2000);
      return () => clearTimeout(t);
    }
    prevPrimaryIdRef.current = primaryProcess.id;
  }, [primaryProcess]);

  // Sort: PRIMARY first, then SECONDARY, then RECOVERING
  const sorted = [...processes].sort((a, b) => {
    const order: Record<Role, number> = { PRIMARY: 0, SECONDARY: 1, RECOVERING: 2, OTHER: 3 };
    return order[deriveRole(a.typeName)] - order[deriveRole(b.typeName)];
  });

  const showSkeleton = loading && processes.length === 0;

  return (
    <div className="space-y-1.5">
      {showSkeleton ? (
        <>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={50} />
          <SkeletonCard delay={100} />
        </>
      ) : processes.length === 0 ? (
        <p className="text-[10px] text-gray-700 px-0.5">
          Atlas control plane required
        </p>
      ) : (
        sorted.map((p, i) => (
          <NodeCard
            key={p.id}
            process={p}
            isNewPrimary={p.id === newPrimaryId}
            enterDelay={i * 50}
          />
        ))
      )}
    </div>
  );
}
