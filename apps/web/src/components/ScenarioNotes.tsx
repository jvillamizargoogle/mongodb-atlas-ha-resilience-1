import { BookOpen } from 'lucide-react';
import type { MetricsSnapshot, WorkloadType } from '@atlas-demo/shared';

interface Props {
  activeScenario: string | null;
  metrics: MetricsSnapshot | null;
}

interface NoteEntry {
  title: string;
  validates: string;
  expected: string;
  observe: string;
  tip?: string;
}

const NOTES: Record<WorkloadType, NoteEntry> = {
  write: {
    title: 'Write Workload',
    validates:
      'Write availability and majority-acknowledgment durability under normal conditions.',
    expected:
      'Inserts acknowledged within single-digit milliseconds. Stable QPS with low variance in ACK latency.',
    observe:
      'Watch Writes/sec and ACK Latency KPI tiles. A healthy cluster shows flat latency. Spikes indicate network pressure or replication lag.',
    tip: 'Trigger a failover during this workload to observe retry behavior and latency spikes.',
  },
  read: {
    title: 'Read Workload',
    validates: 'Read scalability and read-preference routing (primary vs. secondary).',
    expected:
      'Reads return results with low, stable latency. Secondaries serve reads if read preference allows.',
    observe:
      'Check Reads/sec and p50/p95 latencies. Adjust DEFAULT_READ_PREFERENCE in .env to route reads to secondaries and compare.',
    tip: 'Enable secondary read preference to see reads survive a primary failover without interruption.',
  },
  mixed: {
    title: 'Mixed Read/Write',
    validates:
      'Throughput balance and tail-latency behavior under concurrent read and write pressure.',
    expected:
      'Both read and write QPS are active simultaneously. Tail latency (p99) may increase under mixed load due to WiredTiger contention.',
    observe:
      'Watch all three QPS tiles and p99 latency. A rising p99 under stable p50 indicates lock contention.',
    tip: 'Trigger failover during mixed load to observe how the driver queues both reads and writes during election.',
  },
  update: {
    title: 'Update Workload',
    validates:
      'Write-after-write durability and majority write-concern acknowledgment for update operations.',
    expected:
      'updateMany operations acknowledged with majority write concern. modifiedCount should match matchedCount.',
    observe:
      'Monitor Updates/sec and error rate. A failover mid-update may cause a transient error before the driver retries.',
  },
  bulk: {
    title: 'Bulk Write Workload',
    validates:
      'Batch insert throughput and driver bulkWrite efficiency vs. single-document inserts.',
    expected:
      'Higher document throughput per operation at the cost of slightly higher per-operation latency due to batch size.',
    observe:
      'Compare Writes/sec to the single-document write workload. ACK latency will be higher but total documents/sec will be greater.',
    tip: 'Adjust batchSize in the workload config to find the throughput/latency tradeoff sweet spot for your cluster tier.',
  },
};

export default function ScenarioNotes({ activeScenario, metrics }: Props) {
  const workloadType = metrics?.workloadType;
  const note = workloadType ? NOTES[workloadType] : null;

  const connStatus = metrics?.connectionStatus;
  const isError = connStatus === 'error' || connStatus === 'reconnecting';
  const failedOps = metrics?.failedOps ?? 0;

  return (
    <div className="p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-mdb-green shrink-0" />
        <span className="text-xs font-semibold font-display text-white uppercase tracking-wider">
          Scenario Notes
        </span>
      </div>

      {!note ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            No active scenario. Start a workload to see validation notes and observed behavior.
          </p>
          <div className="border border-dashed border-gray-800 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-500 font-display uppercase tracking-wide">
              Available scenarios
            </p>
            {(Object.entries(NOTES) as [WorkloadType, NoteEntry][]).map(([key, n]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-mdb-green/40 text-xs mt-0.5">▸</span>
                <p className="text-xs text-gray-600">{n.title}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <h3 className="text-sm font-semibold font-display text-mdb-green">
              {note.title}
            </h3>
          </div>

          {/* Validates */}
          <div className="space-y-1">
            <p className="text-xs font-display font-medium text-gray-400 uppercase tracking-wider">
              Validates
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">{note.validates}</p>
          </div>

          {/* Expected */}
          <div className="space-y-1">
            <p className="text-xs font-display font-medium text-gray-400 uppercase tracking-wider">
              Expected Behavior
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">{note.expected}</p>
          </div>

          {/* Observe */}
          <div className="space-y-1">
            <p className="text-xs font-display font-medium text-gray-400 uppercase tracking-wider">
              What to Observe
            </p>
            <p className="text-xs text-mdb-green/80 leading-relaxed">{note.observe}</p>
          </div>

          {/* Tip */}
          {note.tip && (
            <div className="bg-orange-950/40 border border-orange-900/40 rounded-lg p-3 space-y-1">
              <p className="text-xs font-display font-medium text-orange-400">Demo Tip</p>
              <p className="text-xs text-orange-200/70 leading-relaxed">{note.tip}</p>
            </div>
          )}

          {/* Scenario ID */}
          {activeScenario && (
            <div className="space-y-1">
              <p className="text-xs font-display text-gray-500 uppercase tracking-wider">
                Scenario ID
              </p>
              <p className="text-xs text-gray-700 font-mono break-all">{activeScenario}</p>
            </div>
          )}

          {/* Live status card */}
          {metrics && (
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-display font-medium text-gray-400 uppercase tracking-wider">
                Live Status
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-xs text-gray-500">Workload</span>
                <span
                  className={`text-xs font-medium font-display ${
                    metrics.workloadStatus === 'running' ? 'text-mdb-green' : 'text-gray-400'
                  }`}
                >
                  {metrics.workloadStatus?.toUpperCase()}
                </span>

                <span className="text-xs text-gray-500">Connection</span>
                <span
                  className={`text-xs font-medium ${
                    connStatus === 'connected' ? 'text-mdb-green' : 'text-red-400'
                  }`}
                >
                  {connStatus ?? '—'}
                </span>

                <span className="text-xs text-gray-500">Failed ops</span>
                <span
                  className={`text-xs font-mono ${
                    failedOps > 0 ? 'text-red-400' : 'text-gray-500'
                  }`}
                >
                  {failedOps.toLocaleString()}
                </span>

                <span className="text-xs text-gray-500">Error rate</span>
                <span
                  className={`text-xs font-mono ${
                    metrics.errorRate > 0.05 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {(metrics.errorRate * 100).toFixed(1)}%
                </span>
              </div>

              {isError && (
                <div className="mt-2 text-xs text-red-400 bg-red-950/50 rounded p-2">
                  ⚠ Connection issue detected — watch the terminal for reconnect events.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
