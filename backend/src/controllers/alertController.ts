import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUnreadAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const markAlertAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    // THE FIX: Explicitly cast the ID as a string so TypeScript knows it is safe for Prisma
    const id = req.params.id as string;
    
    await prisma.alert.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
};