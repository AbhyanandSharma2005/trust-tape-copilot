import { Router } from 'express';
import { 
  getOpenExceptions, 
  processReviewerAction, 
  autoResolveBatch, 
  authorizeBatch 
} from '../controllers/exceptionController';

const router = Router();

router.get('/queue', getOpenExceptions);
router.get('/open', getOpenExceptions);

// NEW: Batch Processing Routes
router.post('/bulk-resolve', autoResolveBatch);
router.post('/bulk-authorize', authorizeBatch);

// Existing single-action route
router.post('/:id/action', processReviewerAction);

export default router;