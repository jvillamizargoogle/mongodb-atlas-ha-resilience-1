import { Router } from 'express';
import { getPublicConfig } from '../config';

const router = Router();

router.get('/public', (_req, res) => {
  res.json({ success: true, data: getPublicConfig() });
});

export default router;
