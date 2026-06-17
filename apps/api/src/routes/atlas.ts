import { Router } from 'express';
import { z } from 'zod';
import * as atlasService from '../services/atlas';
import { metricsTracker } from '../services/metrics';
import { eventBus } from '../services/eventBus';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const router = Router();

function sanitize(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Strip anything that looks like a credential value
  return raw
    .replace(/key[=:]\S+/gi, 'key=[REDACTED]')
    .replace(/password[=:]\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\S+/gi, 'secret=[REDACTED]');
}

router.get('/cluster', async (_req, res) => {
  try {
    const data = await atlasService.getCluster();
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

router.get('/topology', async (_req, res) => {
  try {
    const data = await atlasService.getCluster();
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

const failoverSchema = z.object({
  confirmed: z.boolean({ required_error: 'confirmed is required' }),
});

router.post('/failover', async (req, res) => {
  const parse = failoverSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'confirmed (boolean) is required' });
  }
  try {
    await atlasService.triggerFailover(parse.data.confirmed);
    metricsTracker.recordFailover();
    eventBus.broadcast({
      type: 'terminal',
      payload: {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'failover',
        status: 'warning',
        message: '⚡ PRIMARY FAILOVER triggered via Atlas Admin API — election in progress',
        region: config.APP_REGION,
      },
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Failover triggered successfully' });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

const outageStartSchema = z.object({
  confirmed: z.boolean({ required_error: 'confirmed is required' }),
  providerName: z.string().min(1, 'providerName is required'),
  regionName: z.string().min(1, 'regionName is required'),
});

router.post('/resume', async (_req, res) => {
  try {
    await atlasService.resumeCluster();
    res.json({ success: true, message: 'Cluster resume initiated. It may take a few minutes to become available.' });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

router.post('/outage/start', async (req, res) => {
  const parse = outageStartSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'confirmed, providerName, and regionName are required' });
  }
  try {
    const data = await atlasService.startOutage(
      parse.data.confirmed,
      parse.data.providerName,
      parse.data.regionName
    );
    eventBus.broadcast({
      type: 'atlas_event',
      payload: {
        type: 'outage_start',
        provider: parse.data.providerName,
        region: parse.data.regionName,
      },
      timestamp: new Date().toISOString(),
    });
    eventBus.broadcast({
      type: 'terminal',
      payload: {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'outage_start',
        status: 'warning',
        message: `🔴 OUTAGE SIMULATION started: ${parse.data.providerName}/${parse.data.regionName}`,
        region: config.APP_REGION,
      },
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

router.post('/outage/end', async (_req, res) => {
  try {
    const data = await atlasService.endOutage();
    eventBus.broadcast({
      type: 'terminal',
      payload: {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'outage_end',
        status: 'success',
        message: '🟢 OUTAGE SIMULATION ended — nodes restoring',
        region: config.APP_REGION,
      },
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

router.get('/processes', async (_req, res) => {
  try {
    const data = await atlasService.getProcesses();
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

router.get('/outage/status', async (_req, res) => {
  try {
    const data = await atlasService.getOutageStatus();
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: sanitize(err) });
  }
});

export default router;
