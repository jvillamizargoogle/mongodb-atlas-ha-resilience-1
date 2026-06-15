import type { ApiResponse, WorkloadConfig, PublicConfig, MetricsSnapshot } from '@atlas-demo/shared';

const BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const api = {
  health: () =>
    request<{ status: string; connection: string }>('GET', '/health'),

  publicConfig: () =>
    request<PublicConfig>('GET', '/config/public'),

  metrics: () =>
    request<MetricsSnapshot>('GET', '/metrics'),

  // Atlas
  cluster: () =>
    request<Record<string, unknown>>('GET', '/atlas/cluster'),

  topology: () =>
    request<Record<string, unknown>>('GET', '/atlas/topology'),

  processes: () =>
    request<Record<string, unknown>[]>('GET', '/atlas/processes'),

  triggerFailover: (confirmed: boolean) =>
    request<void>('POST', '/atlas/failover', { confirmed }),

  startOutage: (confirmed: boolean, providerName: string, regionName: string) =>
    request<void>('POST', '/atlas/outage/start', { confirmed, providerName, regionName }),

  endOutage: () =>
    request<void>('POST', '/atlas/outage/end'),

  outageStatus: () =>
    request<Record<string, unknown>>('GET', '/atlas/outage/status'),

  // Workloads
  startWriteWorkload: (cfg?: Partial<WorkloadConfig>) =>
    request<{ scenarioId: string; type: string }>('POST', '/workloads/write/start', cfg ?? {}),

  startReadWorkload: (cfg?: Partial<WorkloadConfig>) =>
    request<{ scenarioId: string; type: string }>('POST', '/workloads/read/start', cfg ?? {}),

  startUpdateWorkload: (cfg?: Partial<WorkloadConfig>) =>
    request<{ scenarioId: string; type: string }>('POST', '/workloads/update/start', cfg ?? {}),

  startMixedWorkload: (cfg?: Partial<WorkloadConfig>) =>
    request<{ scenarioId: string; type: string }>('POST', '/workloads/mixed/start', cfg ?? {}),

  startBulkWorkload: (cfg?: Partial<WorkloadConfig>) =>
    request<{ scenarioId: string; type: string }>('POST', '/workloads/bulk/start', cfg ?? {}),

  stopWorkload: () =>
    request<void>('POST', '/workloads/stop'),

  workloadStatus: () =>
    request<{ status: string; type: string | null; scenarioId: string | null }>('GET', '/workloads/status'),

  resetDemo: () =>
    request<{ deleted: number }>('POST', '/demo/reset'),
};
