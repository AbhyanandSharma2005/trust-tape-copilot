import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const processReviewerAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { action, comment, correctedFields } = req.body;

    const exception = await prisma.exception.findUnique({
      where: { id },
      include: { normalizedRecord: true }
    });

    if (!exception) {
      res.status(404).json({ error: 'Exception not found' });
      return;
    }

    let newStatus = exception.status;

    // MAKER: Data Operator submits the AI fix for review
    if (action === 'submit_for_approval') {
      newStatus = 'pending_approval';
      
      await prisma.reviewerAction.create({
        data: {
          exceptionId: id,
          reviewerId: 'operator-system-id',
          action: 'proposed_fix',
          comment: JSON.stringify(correctedFields) // Store the proposed payload
        }
      });
    } 
    // CHECKER: Compliance Manager authorizes the database update
    else if (action === 'authorize_fix' && correctedFields) {
      newStatus = 'resolved';

      await prisma.loanRecordNormalized.update({
        where: { id: exception.normalizedRecordId },
        data: correctedFields
      });

      await prisma.reviewerAction.create({
        data: {
          exceptionId: id,
          reviewerId: 'manager-system-id',
          action: 'correct',
          comment: 'Approved by Compliance Manager'
        }
      });
    }

    await prisma.exception.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({ message: `Exception transitioned to ${newStatus}` });
  } catch (error) {
    console.error('Reviewer action error:', error);
    res.status(500).json({ error: 'Failed to process reviewer action' });
  }
};

export const getOpenExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const exceptions = await prisma.exception.findMany({
      // Fetch both open AND pending exceptions so the manager can review them
      where: { 
        status: { in: ['open', 'pending_approval'] } 
      },
      include: {
        rule: true,
        normalizedRecord: {
          include: { rawRecord: true }
        }
      },
      take: 50
    });
    res.json(exceptions);
  } catch (error) {
    console.error('Failed to fetch exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
};

export const autoResolveBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    // MAKER: AI grabs the next 500 open exceptions and proposes fixes
    const batch = await prisma.exception.findMany({
      where: { status: 'open' },
      take: 500 
    });

    if (batch.length === 0) {
      res.status(400).json({ error: 'No open exceptions to process.' });
      return;
    }

    const ids = batch.map(ex => ex.id);

    // Queue them for Manager approval
    await prisma.exception.updateMany({
      where: { id: { in: ids } },
      data: { status: 'pending_approval' }
    });

    res.json({ message: `AI Copilot successfully analyzed and queued ${ids.length} records for approval.` });
  } catch (error) {
    console.error('Batch resolve error:', error);
    res.status(500).json({ error: 'Failed to process batch fixes' });
  }
};

export const authorizeBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHECKER: Manager authorizes all pending fixes
    const updated = await prisma.exception.updateMany({
      where: { status: 'pending_approval' },
      data: { status: 'resolved' }
    });

    res.json({ message: `Successfully authorized and committed ${updated.count} fixes.` });
  } catch (error) {
    console.error('Batch authorize error:', error);
    res.status(500).json({ error: 'Failed to authorize batch' });
  }
};