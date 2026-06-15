import { Router, Request, Response } from 'express';
import { eventBus } from '../services/eventBus';
import { metricsTracker } from '../services/metrics';
import type { SSEEvent } from '@atlas-demo/shared';

const router = Router();

router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  function send(event: SSEEvent): void {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // client disconnected; cleanup handled below
    }
  }

  // Send initial state immediately
  send({ type: 'metrics', payload: metricsTracker.getSnapshot(), timestamp: new Date().toISOString() });
  send({ type: 'ping', payload: { connected: true }, timestamp: new Date().toISOString() });

  const listener = (event: SSEEvent) => send(event);
  eventBus.on('event', listener);

  // Heartbeat comment to keep proxy connections alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off('event', listener);
  });
});

export default router;
