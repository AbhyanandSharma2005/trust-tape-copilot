import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const exportCleanTape = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await prisma.loanRecordNormalized.findMany();

    if (records.length === 0) {
      res.status(404).json({ error: 'No records available to export.' });
      return;
    }

    // 1. Dynamically extract the CSV headers from the database schema
    const headers = Object.keys(records[0]).join(',');

    // 2. Map every database row back into a comma-separated string
    const csvRows = records.map(record => {
      return Object.values(record).map(value => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Safely escape any fields that might contain commas
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    // 3. Combine headers and rows
    const csvContent = [headers, ...csvRows].join('\n');

    // 4. Force the browser to download it as a file rather than displaying it
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trusttape_clean_portfolio.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
};