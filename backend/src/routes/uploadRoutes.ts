import { Router } from 'express';
import { handleUpload } from '../controllers/uploadController';
import multer from 'multer';

const router = Router();
// Ensure multer saves to a local temp folder
const upload = multer({ dest: 'uploads/' }); 

// This MUST be '/' so it matches exactly '/api/upload'
router.post('/', upload.single('file'), handleUpload);

export default router;