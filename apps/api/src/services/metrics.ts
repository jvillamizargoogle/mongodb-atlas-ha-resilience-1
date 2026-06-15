import type { MetricsSnapshot, ConnectionStatus, WorkloadStatus, WorkloadType } from '@atlas-demo/shared';
import { getConnectionStatus } from '../db/client';

interface OpRecord {
  type: 'write' | 'read' | 'update';
  latencyMs: number;
  success: boolean;
  timestamp: number;
}

export class MetricsTracker {
  private ops: OpRecord[] = [];
  private retryCount = 0;
  private successfulOps = 0;
  private failedOps = 0;
  private lastFailoverTime?: string;
  private workloadStatus: WorkloadStatus = 'idle';
  private workloadType?: WorkloadType;
  private scenarioId?: string;
  private readonly startTime = Date.now();
  private readonly windowMs = 5_000; // 5-second rolling window for QPS

  recordOp(type: 'write' | 'read' | 'update', latencyMs: number, success: boolean): void {
    this.ops.push({ type, latencyMs, success, timestamp: Date.now() });
    this.pruneOps();
    if (success) this.successfulOps++;
    else this.failedOps++;
  }

  recordRetry(): void {
    this.retryCount++;
  }

  recordFailover(): void {
    this.lastFailoverTime = new Date().toISOString();
  }

  setWorkloadStatus(status: WorkloadStatus, type?: WorkloadType, scenarioId?: string): void {
    this.workloadStatus = status;
    this.workloadType = type;
    this.scenarioId = scenarioId;
  }

  private pruneOps(): void {
    const cutoff = Date.now() - this.windowMs;
    this.ops = this.ops.filter((op) => op.timestamp > cutoff);
  }

  private percentile(latencies: number[], p: number): number {
    if (!latencies.length) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  getSnapshot(): MetricsSnapshot {
    this.pruneOps();
    const windowSec = this.windowMs / 1000;

    const writes = this.ops.filter((o) => o.type === 'write');
    const reads = this.ops.filter((o) => o.type === 'read');
    const updates = this.ops.filter((o) => o.type === 'update');
    const successLatencies = this.ops.filter((o) => o.success).map((o) => o.latencyMs);
    const writeLatencies = writes.filter((o) => o.success).map((o) => o.latencyMs);

    return {
      writesPerSec: writes.length / windowSec,
      readsPerSec: reads.length / windowSec,
      updatesPerSec: updates.length / windowSec,
      avgAckLatencyMs:
        writeLatencies.length
          ? writeLatencies.reduce((a, b) => a + b, 0) / writeLatencies.length
          : 0,
      p50LatencyMs: this.percentile(successLatencies, 50),
      p95LatencyMs: this.percentile(successLatencies, 95),
      p99LatencyMs: this.percentile(successLatencies, 99),
      errorRate:
        this.ops.length
          ? this.ops.filter((o) => !o.success).length / this.ops.length
          : 0,
      retryCount: this.retryCount,
      successfulOps: this.successfulOps,
      failedOps: this.failedOps,
      lastFailoverTime: this.lastFailoverTime,
      connectionStatus: getConnectionStatus() as ConnectionStatus,
      workloadStatus: this.workloadStatus,
      workloadType: this.workloadType,
      scenarioId: this.scenarioId,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  reset(): void {
    this.ops = [];
    this.retryCount = 0;
    this.successfulOps = 0;
    this.failedOps = 0;
    this.lastFailoverTime = undefined;
  }
}

export const metricsTracker = new MetricsTracker();
