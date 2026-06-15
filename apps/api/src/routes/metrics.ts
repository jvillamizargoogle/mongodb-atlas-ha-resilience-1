import { Router } from 'express';
import { metricsTracker } from '../services/metrics';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: metricsTracker.getSnapshot() });
});

export default router;
