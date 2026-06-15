import { Router } from 'express';
import { getConnectionStatus } from '../db/client';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      connection: getConnectionStatus(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
