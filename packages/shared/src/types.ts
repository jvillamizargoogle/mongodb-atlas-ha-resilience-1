export type OperationType =
  | 'write'
  | 'read'
  | 'update'
  | 'delete'
  | 'bulk'
  | 'change_stream'
  | 'failover'
  | 'outage_start'
  | 'outage_end'
  | 'reconnect'
  | 'error'
  | 'retry'
  | 'system';

export type WorkloadType = 'write' | 'read' | 'update' | 'mixed' | 'bulk';

export type WorkloadStatus = 'idle' | 'running' | 'stopping' | 'error';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface ResilienceEvent {
  _id?: string;
  scenarioId: string;
  operationId: string;
  operationType: OperationType;
  appCloudProvider: string;
  appRegion: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  sequence: number;
  status: 'success' | 'failure' | 'pending';
  metadata?: Record<string, unknown>;
  latencyMs?: number;
  errorType?: string;
  errorMessage?: string;
}

export interface TerminalEvent {
  id: string;
  timestamp: string;
  type: OperationType;
  status: 'success' | 'failure' | 'info' | 'warning';
  message: string;
  latencyMs?: number;
  documentId?: string;
  region?: string;
  details?: Record<string, unknown>;
}

export interface MetricsSnapshot {
  writesPerSec: number;
  readsPerSec: number;
  updatesPerSec: number;
  avgAckLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  retryCount: number;
  successfulOps: number;
  failedOps: number;
  lastFailoverTime?: string;
  connectionStatus: ConnectionStatus;
  workloadStatus: WorkloadStatus;
  workloadType?: WorkloadType;
  scenarioId?: string;
  uptime: number;
}

export interface ReplicationSpec {
  id?: string;
  zoneName?: string;
  regionConfigs?: RegionConfig[];
}

export interface RegionConfig {
  providerName?: string;
  regionName?: string;
  electableSpecs?: NodeSpec;
  readOnlySpecs?: NodeSpec;
  analyticsSpecs?: NodeSpec;
  priority?: number;
}

export interface NodeSpec {
  instanceSize?: string;
  nodeCount?: number;
}

export interface AtlasClusterInfo {
  name: string;
  stateName: string;
  mongoDBVersion?: string;
  clusterType?: string;
  diskSizeGB?: number;
  replicationSpecs?: ReplicationSpec[];
  connectionStrings?: {
    standard?: string;
    standardSrv?: string;
  };
}

export interface OutageSimulationStatus {
  id?: string;
  state?: string;
  startRequestDate?: string;
  endRequestDate?: string;
  simulationType?: string;
  affectedRegions?: Array<{ providerName: string; regionName: string }>;
}

export interface WorkloadConfig {
  type?: WorkloadType;
  concurrency?: number;
  intervalMs?: number;
  durationMs?: number;
  readPreference?: string;
  writeConcern?: string;
  payloadSize?: number;
  batchSize?: number;
  readWriteRatio?: number;
  scenarioId?: string;
}

export interface PublicConfig {
  appRegion: string;
  appCloudProvider: string;
  atlasProjectId: string;
  atlasClusterName: string;
  atlasControlPlaneEnabled: boolean;
  destructiveActionsEnabled: boolean;
  mongoDbName: string;
  collectionName: string;
  defaultReadPreference: string;
  defaultWriteConcern: string;
  defaultWorkloadConcurrency: number;
  defaultWorkloadIntervalMs: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type SSEEventType =
  | 'terminal'
  | 'metrics'
  | 'connection'
  | 'workload_status'
  | 'change_stream'
  | 'atlas_event'
  | 'ping';

export interface SSEEvent {
  type: SSEEventType;
  payload: unknown;
  timestamp: string;
}
