import { Router } from 'express';
import { getUnreadAlerts, markAlertAsRead } from '../controllers/alertController';

const router = Router();

router.get('/', getUnreadAlerts);
router.post('/:id/read', markAlertAsRead);

export default router;