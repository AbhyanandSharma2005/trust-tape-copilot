import { Router } from 'express';
import { verifyUpload } from '../controllers/verificationController';

const router = Router();

// POST /api/verify/:uploadId
router.post('/:uploadId', verifyUpload);

export default router;