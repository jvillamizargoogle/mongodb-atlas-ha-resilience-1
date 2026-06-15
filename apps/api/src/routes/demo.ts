import { Router } from 'express';
import { getCollection } from '../db/client';
import { metricsTracker } from '../services/metrics';
import { config } from '../config';

const router = Router();

router.post('/reset', async (_req, res) => {
  if (!config.ENABLE_DESTRUCTIVE_ACTIONS) {
    return res.status(403).json({
      success: false,
      error: 'Destructive actions are disabled. Set ENABLE_DESTRUCTIVE_ACTIONS=true to enable reset.',
    });
  }
  try {
    const collection = getCollection();
    const result = await collection.deleteMany({});
    metricsTracker.reset();
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
