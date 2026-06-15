import { RefreshCw, Server, Database, Globe, Activity } from 'lucide-react';
import type { PublicConfig, WorkloadStatus } from '@atlas-demo/shared';

interface Props {
  config: PublicConfig | null;
  clusterInfo: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  activeScenario: string | null;
  workloadStatus?: WorkloadStatus;
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between items-start gap-2 py-1">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-xs text-right truncate max-w-[130px] ${
          mono ? 'font-mono text-mdb-green' : 'text-gray-300'
        }`}
      >
        {String(value)}
      </span>
    </div>
  );
}

const STATE_COLOR: Record<string, string> = {
  IDLE: 'text-mdb-green',
  CREATING: 'text-yellow-400',
  UPDATING: 'text-yellow-400',
  REPAIRING: 'text-orange-400',
  DELETING: 'text-red-400',
};

export default function TopologyPanel({
  config,
  clusterInfo,
  loading,
  error,
  onRefresh,
  activeScenario,
  workloadStatus,
}: Props) {
  const stateName = (clusterInfo?.stateName as string) ?? null;
  const mongoVersion = (clusterInfo?.mongoDBVersion as string) ?? null;
  const clusterType = (clusterInfo?.clusterType as string) ?? null;

  const replicationSpecs = clusterInfo?.replicationSpecs as
    | Array<Record<string, unknown>>
    | undefined;

  const regions = (replicationSpecs ?? []).flatMap((spec) => {
    const rcs = spec.regionConfigs as Array<Record<string, unknown>> | undefined;
    return (rcs ?? []).map((rc) => ({
      provider: rc.providerName as string,
      region: rc.regionName as string,
      electable:
        ((rc.electableSpecs as Record<string, number> | undefined)?.nodeCount) ?? 0,
      readOnly:
        ((rc.readOnlySpecs as Record<string, number> | undefined)?.nodeCount) ?? 0,
      analytics:
        ((rc.analyticsSpecs as Record<string, number> | undefined)?.nodeCount) ?? 0,
    }));
  });

  const stateColor = STATE_COLOR[stateName ?? ''] ?? 'text-gray-400';

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-mdb-green" />
          <span className="text-xs font-semibold font-display text-white uppercase tracking-wider">
            Infrastructure
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="text-gray-500 hover:text-mdb-green transition-colors"
          title="Refresh cluster info"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Static config */}
      <div className="space-y-0.5 border-b border-gray-800 pb-2">
        <InfoRow label="Project ID" value={config?.atlasProjectId} mono />
        <InfoRow label="Cluster" value={config?.atlasClusterName} />
        <InfoRow label="Database" value={config?.mongoDbName} mono />
        <InfoRow label="Collection" value={config?.collectionName} mono />
      </div>

      {/* Live cluster state */}
      {error ? (
        <div className="text-xs text-red-400 bg-red-950/60 border border-red-900/50 rounded p-2">
          {error}
        </div>
      ) : loading && !clusterInfo ? (
        <div className="text-xs text-gray-500 animate-pulse">Loading cluster…</div>
      ) : clusterInfo ? (
        <div className="space-y-0.5 border-b border-gray-800 pb-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-500">State</span>
            <span className={`text-xs font-semibold font-display ${stateColor}`}>
              {stateName ?? 'UNKNOWN'}
            </span>
          </div>
          <InfoRow label="Type" value={clusterType} />
          <InfoRow label="Version" value={mongoVersion} />
        </div>
      ) : null}

      {/* Region topology */}
      {regions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Regions</span>
          </div>
          {regions.map((r, i) => (
            <div key={i} className="bg-gray-800/70 rounded p-2 space-y-1">
              <div className="flex items-center gap-1">
                <Server className="w-3 h-3 text-mdb-green" />
                <span className="text-xs font-medium text-white truncate">
                  {r.provider} / {r.region}
                </span>
              </div>
              <div className="flex gap-3 text-xs">
                {r.electable > 0 && (
                  <span className="text-green-400">{r.electable} electable</span>
                )}
                {r.readOnly > 0 && (
                  <span className="text-blue-400">{r.readOnly} read-only</span>
                )}
                {r.analytics > 0 && (
                  <span className="text-purple-400">{r.analytics} analytics</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scenario status */}
      <div className="border-t border-gray-800 pt-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Activity className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Scenario</span>
        </div>
        {activeScenario ? (
          <div className="space-y-1">
            <div
              className={`text-xs px-2 py-1 rounded font-medium font-display ${
                workloadStatus === 'running'
                  ? 'bg-mdb-green/20 text-mdb-green'
                  : workloadStatus === 'stopping'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : workloadStatus === 'error'
                  ? 'bg-red-900/40 text-red-400'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {workloadStatus?.toUpperCase() ?? 'IDLE'}
            </div>
            <p className="text-xs text-gray-600 font-mono truncate">
              {activeScenario.slice(0, 16)}…
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">No active scenario</p>
        )}
      </div>
    </div>
  );
}
