import { config } from '../config';

const ATLAS_MEDIA_TYPE = 'application/vnd.atlas.2023-01-01+json';

function buildAuthHeader(): string {
  // Atlas Admin API supports HTTP Basic auth with public/private key pair
  const credentials = Buffer.from(
    `${config.ATLAS_PUBLIC_KEY}:${config.ATLAS_PRIVATE_KEY}`
  ).toString('base64');
  return `Basic ${credentials}`;
}

async function atlasRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!config.ATLAS_PUBLIC_KEY || !config.ATLAS_PRIVATE_KEY) {
    throw new Error('Atlas API credentials (ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY) are not configured.');
  }
  if (!config.ENABLE_ATLAS_CONTROL_PLANE) {
    throw new Error('Atlas control plane is disabled. Set ENABLE_ATLAS_CONTROL_PLANE=true to enable.');
  }

  const url = `${config.ATLAS_API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': ATLAS_MEDIA_TYPE,
      'Accept': ATLAS_MEDIA_TYPE,
      'Authorization': buildAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 429) {
    throw new Error('Atlas API rate limit exceeded. Please wait before retrying.');
  }

  const text = await response.text();

  if (!response.ok) {
    let errorMessage = `Atlas API error: HTTP ${response.status}`;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      // Sanitize: only extract the detail/error message, never raw credentials
      errorMessage = String(json['detail'] ?? json['error'] ?? json['message'] ?? errorMessage);
    } catch {
      // Use default message
    }
    throw new Error(errorMessage);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function getCluster(): Promise<Record<string, unknown>> {
  const projectId = config.ATLAS_PROJECT_ID;
  const clusterName = config.ATLAS_CLUSTER_NAME;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'GET',
    `/groups/${projectId}/clusters/${clusterName}`
  );
}

export async function triggerFailover(confirmed: boolean): Promise<void> {
  if (!confirmed) throw new Error('Failover requires explicit confirmation (confirmed: true).');
  if (!config.ENABLE_DESTRUCTIVE_ACTIONS) {
    throw new Error(
      'Destructive actions are disabled. Set ENABLE_DESTRUCTIVE_ACTIONS=true to enable failover.'
    );
  }
  const projectId = config.ATLAS_PROJECT_ID;
  const clusterName = config.ATLAS_CLUSTER_NAME;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  await atlasRequest<void>(
    'POST',
    `/groups/${projectId}/clusters/${clusterName}/restartPrimaries`
  );
}

export async function startOutage(
  confirmed: boolean,
  providerName: string,
  regionName: string
): Promise<Record<string, unknown>> {
  if (!confirmed)
    throw new Error('Outage simulation requires explicit confirmation (confirmed: true).');
  if (!config.ENABLE_DESTRUCTIVE_ACTIONS) {
    throw new Error(
      'Destructive actions are disabled. Set ENABLE_DESTRUCTIVE_ACTIONS=true to enable outage simulation.'
    );
  }
  const projectId = config.ATLAS_PROJECT_ID;
  const clusterName = config.ATLAS_CLUSTER_NAME;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'POST',
    `/groups/${projectId}/clusters/${clusterName}/outageSimulation`,
    { outageFilters: [{ cloudProvider: providerName, regionName }] }
  );
}

export async function endOutage(): Promise<Record<string, unknown>> {
  const projectId = config.ATLAS_PROJECT_ID;
  const clusterName = config.ATLAS_CLUSTER_NAME;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'DELETE',
    `/groups/${projectId}/clusters/${clusterName}/outageSimulation`
  );
}

export async function getOutageStatus(): Promise<Record<string, unknown>> {
  const projectId = config.ATLAS_PROJECT_ID;
  const clusterName = config.ATLAS_CLUSTER_NAME;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'GET',
    `/groups/${projectId}/clusters/${clusterName}/outageSimulation`
  );
}
