import { Router } from 'express';
import { runWarehouseETL, getWarehouseStats } from '../controllers/etlController';

const router = Router();

router.post('/sync', runWarehouseETL);
router.get('/stats', getWarehouseStats);

export default router;