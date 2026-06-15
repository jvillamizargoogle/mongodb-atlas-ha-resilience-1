import { describe, it, expect } from 'vitest';

describe('Config public shape', () => {
  it('getPublicConfig does not expose private keys', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.ATLAS_PUBLIC_KEY = 'pub-key';
    process.env.ATLAS_PRIVATE_KEY = 'priv-key-secret';

    // Dynamic import so env is set first
    const { getPublicConfig } = await import('../config');
    const pub = getPublicConfig();

    // Public config must never contain private key
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain('priv-key-secret');
    expect(pub).toHaveProperty('atlasControlPlaneEnabled');
    expect(pub).toHaveProperty('appRegion');
  });
});
