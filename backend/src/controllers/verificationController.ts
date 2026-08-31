import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateRecordHash } from '../utils/hash';

const prisma = new PrismaClient();

export const verifyUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadId = req.params.uploadId as string;

    // 1. Fetch all normalized records for this upload, including their exceptions
    const records = await prisma.loanRecordNormalized.findMany({
      where: { rawRecord: { uploadId: uploadId } },
      include: { exceptions: true }
    });

    if (records.length === 0) {
      res.status(404).json({ error: 'No records found for this upload ID' });
      return;
    }

    // Grab a system user to attach to the audit trail
    const systemReviewer = await prisma.user.findFirst({ where: { role: 'reviewer' } });
    if (!systemReviewer) {
       res.status(500).json({ error: 'System reviewer not found. Did you run the seed script?' });
       return;
    }

    let verifiedCount = 0;
    const verifiedRecordsData = [];

    // 2. Process each record
    for (const record of records) {
      // A record is "clean" if it has 0 exceptions OR every exception is 'resolved'
      const isClean = record.exceptions.every(ex => ex.status === 'resolved');

      if (isClean) {
        // Generate the cryptographic seal
        const recordHash = generateRecordHash(record);

        verifiedRecordsData.push({
          normalizedRecordId: record.id,
          recordHash: recordHash,
          verifiedAt: new Date(),
          // Adding the required schema fields for strict auditing compliance
          reviewerId: systemReviewer.id,
          validationResult: record.exceptions.length === 0 ? 'clean_on_arrival' : 'exceptions_resolved',
          reviewerDecision: 'auto_approved_by_system'
        });
        verifiedCount++;
      }
    }

    // 3. Batch insert the verified records
    if (verifiedRecordsData.length > 0) {
      await prisma.verifiedLoan.createMany({
        data: verifiedRecordsData
        // skipDuplicates removed here since SQLite doesn't support it!
      });
    }

    // 4. Respond with the sealing statistics
    res.json({
      message: 'Verification and hashing process complete',
      totalRecords: records.length,
      cleanRecordsVerified: verifiedCount,
      recordsStillPending: records.length - verifiedCount
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify records' });
  }
};