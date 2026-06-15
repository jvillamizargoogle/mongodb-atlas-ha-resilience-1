import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// __dirname is apps/api/src — go up three levels to reach the monorepo root .env
// dotenv silently no-ops if the file doesn't exist (e.g. Docker passes env vars directly)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.string().default('3001'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('atlas_ha_demo'),
  MONGODB_COLLECTION_NAME: z.string().default('resilience_events'),
  APP_REGION: z.string().default('us-east-1'),
  APP_CLOUD_PROVIDER: z.string().default('aws'),
  ATLAS_PUBLIC_KEY: z.string().optional(),
  ATLAS_PRIVATE_KEY: z.string().optional(),
  ATLAS_PROJECT_ID: z.string().optional(),
  ATLAS_CLUSTER_NAME: z.string().optional(),
  ATLAS_API_BASE_URL: z.string().default('https://cloud.mongodb.com/api/atlas/v2'),
  ENABLE_ATLAS_CONTROL_PLANE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  ENABLE_DESTRUCTIVE_ACTIONS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  DEFAULT_READ_PREFERENCE: z.string().default('primary'),
  DEFAULT_WRITE_CONCERN: z.string().default('majority'),
  DEFAULT_WORKLOAD_CONCURRENCY: z
    .string()
    .default('5')
    .transform(Number),
  DEFAULT_WORKLOAD_INTERVAL_MS: z
    .string()
    .default('200')
    .transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export function getPublicConfig() {
  return {
    appRegion: config.APP_REGION,
    appCloudProvider: config.APP_CLOUD_PROVIDER,
    atlasProjectId: config.ATLAS_PROJECT_ID ?? '',
    atlasClusterName: config.ATLAS_CLUSTER_NAME ?? '',
    atlasControlPlaneEnabled: config.ENABLE_ATLAS_CONTROL_PLANE,
    destructiveActionsEnabled: config.ENABLE_DESTRUCTIVE_ACTIONS,
    mongoDbName: config.MONGODB_DB_NAME,
    collectionName: config.MONGODB_COLLECTION_NAME,
    defaultReadPreference: config.DEFAULT_READ_PREFERENCE,
    defaultWriteConcern: config.DEFAULT_WRITE_CONCERN,
    defaultWorkloadConcurrency: config.DEFAULT_WORKLOAD_CONCURRENCY,
    defaultWorkloadIntervalMs: config.DEFAULT_WORKLOAD_INTERVAL_MS,
  };
}
