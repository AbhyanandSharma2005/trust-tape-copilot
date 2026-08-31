import { Router } from 'express';
import { exportCleanTape } from '../controllers/exportController';

const router = Router();

router.get('/', exportCleanTape);

export default router;