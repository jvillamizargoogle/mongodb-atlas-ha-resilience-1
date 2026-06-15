import crypto from 'crypto';
import { config } from '../config';

const ATLAS_MEDIA_TYPE = 'application/vnd.atlas.2023-01-01+json';

// ── HTTP Digest Authentication ──────────────────────────────────────────────
// Atlas Admin API v2 requires Digest auth, not Basic auth.
// Flow: probe → 401 with WWW-Authenticate: Digest nonce → resend with computed response.

function md5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

function parseDigestChallenge(header: string) {
  const get = (key: string) => header.match(new RegExp(`${key}="([^"]+)"`))?.[1] ?? '';
  return {
    realm: get('realm'),
    nonce: get('nonce'),
    qop: header.match(/qop="?([^",\s]+)/)?.[1],
  };
}

function buildDigestHeader(
  method: string,
  uri: string,
  challenge: ReturnType<typeof parseDigestChallenge>
): string {
  const { realm, nonce, qop } = challenge;
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  const ha1 = md5(`${config.ATLAS_PUBLIC_KEY}:${realm}:${config.ATLAS_PRIVATE_KEY}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  return [
    `Digest username="${config.ATLAS_PUBLIC_KEY}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    ...(qop ? [`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`] : []),
    `response="${response}"`,
  ].join(', ');
}

// ── Core request ────────────────────────────────────────────────────────────

async function atlasRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!config.ATLAS_PUBLIC_KEY || !config.ATLAS_PRIVATE_KEY) {
    throw new Error('Atlas API credentials (ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY) are not configured.');
  }
  if (!config.ENABLE_ATLAS_CONTROL_PLANE) {
    throw new Error('Atlas control plane is disabled. Set ENABLE_ATLAS_CONTROL_PLANE=true to enable.');
  }

  const url = `${config.ATLAS_API_BASE_URL}${path}`;
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
  // uri for Digest HA2 is path + query, no host
  const uri = new URL(url).pathname + new URL(url).search;

  // Step 1: probe — get the Digest challenge (401 + WWW-Authenticate header)
  const probe = await fetch(url, {
    method,
    headers: { Accept: ATLAS_MEDIA_TYPE },
  });

  const wwwAuth = probe.headers.get('WWW-Authenticate') ?? '';
  if (!wwwAuth.toLowerCase().startsWith('digest')) {
    throw new Error(
      `Atlas did not return a Digest challenge (got: "${wwwAuth || 'none'}").\n` +
      `Verify ATLAS_PUBLIC_KEY and ATLAS_PRIVATE_KEY are correct.`
    );
  }

  // Step 2: authenticated request
  const authHeader = buildDigestHeader(method, uri, parseDigestChallenge(wwwAuth));

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': ATLAS_MEDIA_TYPE,
      Accept: ATLAS_MEDIA_TYPE,
      Authorization: authHeader,
    },
    body: bodyStr,
  });

  if (response.status === 429) {
    throw new Error('Atlas API rate limit exceeded. Please wait before retrying.');
  }

  const text = await response.text();

  if (!response.ok) {
    let errorMessage = `Atlas API error: HTTP ${response.status}`;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const detail = String(json['detail'] ?? json['message'] ?? '');
      const code = json['errorCode'] ? ` [${json['errorCode']}]` : '';
      errorMessage = detail ? `${detail}${code}` : `HTTP ${response.status}${code}`;
    } catch {
      // keep default
    }
    throw new Error(errorMessage);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ── Public API functions ────────────────────────────────────────────────────

export async function getCluster(): Promise<Record<string, unknown>> {
  const { ATLAS_PROJECT_ID: projectId, ATLAS_CLUSTER_NAME: clusterName } = config;
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
    throw new Error('Destructive actions are disabled. Set ENABLE_DESTRUCTIVE_ACTIONS=true to enable failover.');
  }
  const { ATLAS_PROJECT_ID: projectId, ATLAS_CLUSTER_NAME: clusterName } = config;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  await atlasRequest<void>('POST', `/groups/${projectId}/clusters/${clusterName}/restartPrimaries`);
}

export async function startOutage(
  confirmed: boolean,
  providerName: string,
  regionName: string
): Promise<Record<string, unknown>> {
  if (!confirmed) throw new Error('Outage simulation requires explicit confirmation (confirmed: true).');
  if (!config.ENABLE_DESTRUCTIVE_ACTIONS) {
    throw new Error('Destructive actions are disabled. Set ENABLE_DESTRUCTIVE_ACTIONS=true to enable outage simulation.');
  }
  const { ATLAS_PROJECT_ID: projectId, ATLAS_CLUSTER_NAME: clusterName } = config;
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
  const { ATLAS_PROJECT_ID: projectId, ATLAS_CLUSTER_NAME: clusterName } = config;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'DELETE',
    `/groups/${projectId}/clusters/${clusterName}/outageSimulation`
  );
}

export async function getOutageStatus(): Promise<Record<string, unknown>> {
  const { ATLAS_PROJECT_ID: projectId, ATLAS_CLUSTER_NAME: clusterName } = config;
  if (!projectId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID and ATLAS_CLUSTER_NAME must be configured.');
  }
  return atlasRequest<Record<string, unknown>>(
    'GET',
    `/groups/${projectId}/clusters/${clusterName}/outageSimulation`
  );
}

export interface AtlasProcess {
  id: string;
  hostname: string;
  port: number;
  typeName: string;
  version: string;
  replicaSetName?: string;
}

export async function getProcesses(): Promise<AtlasProcess[]> {
  const projectId = config.ATLAS_PROJECT_ID;
  if (!projectId) throw new Error('ATLAS_PROJECT_ID must be configured.');
  const result = await atlasRequest<{ results: AtlasProcess[] }>(
    'GET',
    `/groups/${projectId}/processes`
  );
  return result.results ?? [];
}
