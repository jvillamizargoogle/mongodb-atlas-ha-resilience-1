import type { ChangeStream, ChangeStreamDocument } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from './client';
import { eventBus } from '../services/eventBus';
import { config } from '../config';

let changeStream: ChangeStream | null = null;
let resumeToken: unknown = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

function emitStreamEvent(message: string, status: 'info' | 'warning' | 'failure' = 'info'): void {
  eventBus.broadcast({
    type: 'terminal',
    payload: {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'change_stream',
      status,
      message,
      region: config.APP_REGION,
    },
    timestamp: new Date().toISOString(),
  });
}

async function openStream(): Promise<void> {
  if (stopped) return;

  try {
    const collection = getCollection();
    const options = resumeToken ? { resumeAfter: resumeToken } : {};
    changeStream = collection.watch([], options);

    emitStreamEvent('Change stream connected and watching resilience_events');

    changeStream.on('change', (change: ChangeStreamDocument) => {
      resumeToken = change._id;

      const docKey =
        'documentKey' in change && change.documentKey
          ? (change.documentKey as Record<string, unknown>)
          : null;
      const docId = docKey?._id != null ? String(docKey._id) : undefined;

      eventBus.broadcast({
        type: 'change_stream',
        payload: {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          type: 'change_stream',
          status: 'info',
          message: `CS ${change.operationType.toUpperCase()}${docId ? ` id=${docId.slice(0, 8)}…` : ''}`,
          documentId: docId,
          region: config.APP_REGION,
          details: { operationType: change.operationType },
        },
        timestamp: new Date().toISOString(),
      });
    });

    changeStream.on('error', (err: Error) => {
      emitStreamEvent(`Change stream error: ${err.message} — scheduling reconnect`, 'warning');
      scheduleReconnect();
    });

    changeStream.on('close', () => {
      if (!stopped) {
        emitStreamEvent('Change stream closed unexpectedly — scheduling reconnect', 'warning');
        scheduleReconnect();
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emitStreamEvent(`Change stream failed to open: ${msg} — retrying in 5s`, 'failure');
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (stopped || reconnectTimer) return;
  changeStream = null;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    emitStreamEvent('Attempting change stream reconnect…', 'info');
    await openStream();
  }, 5_000);
}

export async function startChangeStream(): Promise<void> {
  stopped = false;
  await openStream();
}

export function stopChangeStream(): void {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (changeStream) {
    changeStream.close().catch(() => {});
    changeStream = null;
  }
}
