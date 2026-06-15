import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { startWorkload, stopWorkload, getWorkloadStatus } from '../services/workload';

const router = Router();

const workloadConfigSchema = z.object({
  concurrency: z.number().int().min(1).max(50).optional(),
  intervalMs: z.number().int().min(50).optional(),
  durationMs: z.number().int().optional(),
  readPreference: z.string().optional(),
  writeConcern: z.string().optional(),
  payloadSize: z.number().int().optional(),
  batchSize: z.number().int().min(1).max(1000).optional(),
  readWriteRatio: z.number().min(0).max(1).optional(),
  scenarioId: z.string().optional(),
});

async function handleStart(
  type: 'write' | 'read' | 'update' | 'mixed' | 'bulk',
  req: Request,
  res: Response
): Promise<void> {
  const parse = workloadConfigSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: parse.error.message });
    return;
  }
  try {
    const scenarioId = await startWorkload(type, parse.data);
    res.json({ success: true, data: { scenarioId, type } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(409).json({ success: false, error: msg });
  }
}

router.post('/write/start', (req, res) => handleStart('write', req, res));
router.post('/read/start', (req, res) => handleStart('read', req, res));
router.post('/update/start', (req, res) => handleStart('update', req, res));
router.post('/mixed/start', (req, res) => handleStart('mixed', req, res));
router.post('/bulk/start', (req, res) => handleStart('bulk', req, res));

router.post('/stop', (_req, res: Response) => {
  try {
    stopWorkload();
    res.json({ success: true, message: 'Stop signal sent. Workload will finish current operations.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(409).json({ success: false, error: msg });
  }
});

router.get('/status', (_req, res: Response) => {
  res.json({ success: true, data: getWorkloadStatus() });
});

export default router;
