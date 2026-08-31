// backend/src/routes/aiRoutes.ts
import { Router } from 'express';
import { getAiRecommendation } from '../controllers/aiController';

const router = Router();

// POST /api/ai/recommend/:exceptionId
router.post('/recommend/:exceptionId', getAiRecommendation);

export default router;