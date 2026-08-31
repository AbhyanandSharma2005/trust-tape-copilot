// backend/src/routes/validationRoutes.ts
import { Router, Request, Response } from 'express';
import { runValidationForUpload } from '../services/validationEngine';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/run/:uploadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadId = req.params.uploadId as string; // Explicitly cast to string to satisfy TS
    const operator = await prisma.user.findFirst({ where: { role: 'data_operator' } });
    
    if (!operator) {
       res.status(500).json({ error: 'Operator not found' });
       return;
    }

    const results = await runValidationForUpload(uploadId, operator.id);
    res.json({ message: 'Validation complete', results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run validation' });
  }
});

export default router;