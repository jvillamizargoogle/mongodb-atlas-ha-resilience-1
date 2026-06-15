import { MongoClient } from 'mongodb';
import { config } from '../config';
import type { ConnectionStatus } from '@atlas-demo/shared';

let client: MongoClient | null = null;
let connectionStatus: ConnectionStatus = 'disconnected';

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export async function getClient(): Promise<MongoClient> {
  if (client) return client;

  connectionStatus = 'reconnecting';

  // OLTP long-running server configuration per MongoDB connection best practices:
  // - maxPoolSize 50: sized for demo concurrency (up to 5 workers × 10 headroom)
  // - minPoolSize 10: pre-warmed connections for immediate demo responsiveness
  // - maxIdleTimeMS 300000: 5min keep-alive on a stable server
  // - serverSelectionTimeoutMS 10000: fail fast on topology changes during failover demo
  client = new MongoClient(config.MONGODB_URI, {
    maxPoolSize: 50,
    minPoolSize: 10,
    maxIdleTimeMS: 300_000,
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    retryWrites: true,
    retryReads: true,
  });

  try {
    await client.connect();
    connectionStatus = 'connected';

    client.on('serverOpening', () => {
      connectionStatus = 'connected';
    });
    client.on('serverClosed', () => {
      connectionStatus = 'reconnecting';
    });
    client.on('error', () => {
      connectionStatus = 'error';
    });
    client.on('close', () => {
      connectionStatus = 'disconnected';
    });

    console.log('[MongoDB] Client connected');
    return client;
  } catch (err) {
    connectionStatus = 'error';
    client = null;
    throw err;
  }
}

export function getDb() {
  if (!client) throw new Error('MongoDB client not initialized. Call getClient() first.');
  return client.db(config.MONGODB_DB_NAME);
}

export function getCollection() {
  return getDb().collection(config.MONGODB_COLLECTION_NAME);
}

export async function closeClient() {
  if (client) {
    await client.close();
    client = null;
    connectionStatus = 'disconnected';
  }
}
