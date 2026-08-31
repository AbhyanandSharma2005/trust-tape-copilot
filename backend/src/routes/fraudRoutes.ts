import { Router } from 'express';
import { detectFraudRings, resolveFraudRing } from '../controllers/fraudController';

const router = Router();

// GET /api/fraud/rings -> Fetches the graph theory clusters
router.get('/rings', detectFraudRings);

// POST /api/fraud/action -> Freezes the syndicate!
router.post('/action', resolveFraudRing);

export default router;