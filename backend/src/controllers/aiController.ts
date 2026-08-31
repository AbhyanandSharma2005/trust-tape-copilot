// backend/src/controllers/aiController.ts
import { Request, Response } from 'express';
import { generateRecommendation } from '../services/aiService';

export const getAiRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const exceptionId = req.params.exceptionId as string;
    
    // In a real app, you'd check if a recommendation already exists first, 
    // but we'll generate a fresh one for the demo.
    const recommendation = await generateRecommendation(exceptionId);
    
    res.json({ message: 'AI Recommendation generated', recommendation });
  } catch (error: any) {
    console.error('AI Error:', error.message);
    res.status(500).json({ error: 'Failed to generate AI recommendation. Check API key.' });
  }
};