import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { PublicConfig } from '@atlas-demo/shared';

interface AtlasState {
  config: PublicConfig | null;
  clusterInfo: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

export function useAtlas() {
  const [state, setState] = useState<AtlasState>({
    config: null,
    clusterInfo: null,
    loading: true,
    error: null,
  });

  const fetchConfig = useCallback(async () => {
    const res = await api.publicConfig();
    if (res.success && res.data) {
      setState((s) => ({ ...s, config: res.data! }));
    }
  }, []);

  const fetchCluster = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await api.cluster();
    if (res.success && res.data) {
      setState((s) => ({ ...s, clusterInfo: res.data!, loading: false }));
    } else {
      setState((s) => ({
        ...s,
        error: res.error ?? 'Failed to fetch cluster info',
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchCluster();
    const interval = setInterval(fetchCluster, 30_000);
    return () => clearInterval(interval);
  }, [fetchConfig, fetchCluster]);

  return { ...state, refresh: fetchCluster };
}
