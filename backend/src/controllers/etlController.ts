import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runWarehouseETL = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. EXTRACT: Find all records that have no open or pending exceptions
    const cleanRecords = await prisma.loanRecordNormalized.findMany({
      where: {
        exceptions: {
          none: { status: { in: ['open', 'pending_approval'] } }
        }
      }
    });

    if (cleanRecords.length === 0) {
      res.status(400).json({ error: 'No fully compliant records available for migration.' });
      return;
    }

    // 2. TRANSFORM & LOAD: Map them to the Warehouse schema
    const warehouseData = cleanRecords.map(record => ({
      loanId: record.loanId || 'UNKNOWN',
      borrowerId: record.borrowerId,
      currentBalance: record.currentBalance,
      interestRate: record.interestRate,
      creditGrade: record.creditGrade,
      paymentStatus: record.paymentStatus
    }));

    // Execute the migration as a secure database transaction
    await prisma.$transaction([
      prisma.warehouseRecord.createMany({ data: warehouseData }),
      // Clear the operational tables to keep the app lightning fast
      prisma.loanRecordNormalized.deleteMany({
        where: { id: { in: cleanRecords.map(r => r.id) } }
      })
    ]);

    // 3. ALERT: Notify the system
    await prisma.alert.create({
      data: {
        severity: 'SUCCESS',
        message: `ETL Pipeline successfully migrated ${cleanRecords.length} records to the Data Warehouse.`
      }
    });

    res.json({ 
      message: 'ETL sync complete', 
      recordsMigrated: cleanRecords.length 
    });
  } catch (error) {
    console.error('ETL Pipeline Error:', error);
    res.status(500).json({ error: 'Data warehouse migration failed.' });
  }
};

export const getWarehouseStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRecords = await prisma.warehouseRecord.count();
    res.json({ totalRecords });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouse stats.' });
  }
};