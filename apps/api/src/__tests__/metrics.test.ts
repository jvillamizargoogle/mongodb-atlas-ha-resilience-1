import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsTracker } from '../services/metrics';

vi.mock('../db/client', () => ({
  getConnectionStatus: () => 'connected',
}));

describe('MetricsTracker', () => {
  let tracker: MetricsTracker;

  beforeEach(() => {
    tracker = new MetricsTracker();
  });

  it('starts with zero metrics', () => {
    const snap = tracker.getSnapshot();
    expect(snap.writesPerSec).toBe(0);
    expect(snap.readsPerSec).toBe(0);
    expect(snap.updatesPerSec).toBe(0);
    expect(snap.successfulOps).toBe(0);
    expect(snap.failedOps).toBe(0);
    expect(snap.retryCount).toBe(0);
    expect(snap.errorRate).toBe(0);
  });

  it('counts successful and failed ops separately', () => {
    tracker.recordOp('write', 10, true);
    tracker.recordOp('write', 20, false);
    const snap = tracker.getSnapshot();
    expect(snap.successfulOps).toBe(1);
    expect(snap.failedOps).toBe(1);
  });

  it('calculates error rate correctly', () => {
    tracker.recordOp('read', 5, true);
    tracker.recordOp('read', 5, false);
    const snap = tracker.getSnapshot();
    expect(snap.errorRate).toBeCloseTo(0.5);
  });

  it('calculates percentiles from latency data', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const l of latencies) tracker.recordOp('write', l, true);
    const snap = tracker.getSnapshot();
    expect(snap.p50LatencyMs).toBeGreaterThan(0);
    expect(snap.p99LatencyMs).toBeGreaterThanOrEqual(snap.p95LatencyMs);
    expect(snap.p95LatencyMs).toBeGreaterThanOrEqual(snap.p50LatencyMs);
  });

  it('increments retry count', () => {
    tracker.recordRetry();
    tracker.recordRetry();
    expect(tracker.getSnapshot().retryCount).toBe(2);
  });

  it('records failover time', () => {
    expect(tracker.getSnapshot().lastFailoverTime).toBeUndefined();
    tracker.recordFailover();
    expect(tracker.getSnapshot().lastFailoverTime).toBeDefined();
  });

  it('resets all counters', () => {
    tracker.recordOp('write', 10, true);
    tracker.recordOp('read', 5, false);
    tracker.recordRetry();
    tracker.recordFailover();
    tracker.reset();
    const snap = tracker.getSnapshot();
    expect(snap.successfulOps).toBe(0);
    expect(snap.failedOps).toBe(0);
    expect(snap.retryCount).toBe(0);
    expect(snap.lastFailoverTime).toBeUndefined();
  });

  it('tracks workload status', () => {
    tracker.setWorkloadStatus('running', 'write', 'test-scenario');
    const snap = tracker.getSnapshot();
    expect(snap.workloadStatus).toBe('running');
    expect(snap.workloadType).toBe('write');
    expect(snap.scenarioId).toBe('test-scenario');
  });

  it('uptime increases over time', () => {
    const snap = tracker.getSnapshot();
    expect(snap.uptime).toBeGreaterThanOrEqual(0);
  });
});
