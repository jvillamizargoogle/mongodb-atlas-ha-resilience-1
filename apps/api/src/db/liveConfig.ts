import { config } from '../config';

// In-memory overrides set via the /api/settings/connection endpoint.
// Persisted in the browser's localStorage on the client; lost on API restart.
let overrideMongoUri: string | null = null;
let overrideClusterName: string | null = null;

export function getLiveMongoUri(): string {
  return overrideMongoUri ?? config.MONGODB_URI;
}

export function getLiveClusterName(): string | undefined {
  return overrideClusterName ?? config.ATLAS_CLUSTER_NAME;
}

export function setOverride(mongoUri: string | null, clusterName: string | null): void {
  overrideMongoUri = mongoUri;
  overrideClusterName = clusterName;
}

export function isOverrideActive(): boolean {
  return overrideMongoUri !== null || overrideClusterName !== null;
}

export function extractUriHost(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return '[invalid URI]';
  }
}
