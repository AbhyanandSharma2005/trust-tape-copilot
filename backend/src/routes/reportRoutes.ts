import { Router } from 'express';
import { getExecutiveSummary } from '../controllers/reportController';

const router = Router();

router.get('/summary', getExecutiveSummary);

export default router;