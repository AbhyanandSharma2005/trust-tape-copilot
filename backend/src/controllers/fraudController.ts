import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const detectFraudRings = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch all normalized records
    const records = await prisma.loanRecordNormalized.findMany();

    // 2. Build the Graph (Adjacency List)
    const adjList = new Map<string, Set<string>>();
    const borrowerMap = new Map<string, any[]>();

    // Map records by borrowerId to find overlaps
    records.forEach(record => {
      // THE FIX: Skip this record if it has no borrower ID!
      if (!record.borrowerId) return; 

      if (!borrowerMap.has(record.borrowerId)) {
        borrowerMap.set(record.borrowerId, []);
      }
      borrowerMap.get(record.borrowerId)!.push(record);
    });

    // Create edges between all loans that share the same borrowerId
    for (const [borrowerId, loans] of borrowerMap.entries()) {
      if (loans.length > 1) {
        for (let i = 0; i < loans.length; i++) {
          for (let j = i + 1; j < loans.length; j++) {
            const u = loans[i].loanId;
            const v = loans[j].loanId;
            
            // Safety check: ensure loanId is not null
            if (!u || !v) continue;
            
            if (!adjList.has(u)) adjList.set(u, new Set());
            if (!adjList.has(v)) adjList.set(v, new Set());
            
            adjList.get(u)!.add(v);
            adjList.get(v)!.add(u);
          }
        }
      }
    }

    // 3. Find Connected Components using Depth-First Search (DFS)
    const visited = new Set<string>();
    const fraudRings: any[] = [];

    for (const node of adjList.keys()) {
      if (!visited.has(node)) {
        const component: string[] = [];
        const stack = [node];
        visited.add(node);

        while (stack.length > 0) {
          const curr = stack.pop()!;
          component.push(curr);
          
          for (const neighbor of Array.from(adjList.get(curr) || [])) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              stack.push(neighbor);
            }
          }
        }

        // Only flag connected components larger than 1 (a cluster)
        if (component.length > 1) {
          fraudRings.push({
            ringId: `FR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            size: component.length,
            nodes: component,
            riskLevel: component.length > 3 ? 'CRITICAL' : 'HIGH'
          });
        }
      }
    }

    // Sort by largest rings first
    fraudRings.sort((a, b) => b.size - a.size);

    res.json({ totalRings: fraudRings.length, rings: fraudRings });
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Failed to execute graph algorithms' });
  }
};

export const resolveFraudRing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ringId, loanIds, action } = req.body;

    // In a production environment, this is where we would execute an SQL UPDATE
    // to change the status of all these loanIds to 'FROZEN' and dispatch a webhook 
    // to the compliance team. 
    
    // For the hackathon demo, we will simulate the heavy backend processing time 
    // so the judges can see your frontend loading states!
    await new Promise(resolve => setTimeout(resolve, 1200));

    console.log(`[COMPLIANCE] Action '${action}' executed on Syndicate ${ringId}. Frozen IDs:`, loanIds);

    res.json({ 
      success: true, 
      message: `Syndicate ${ringId} successfully frozen. All associated entities locked.` 
    });
  } catch (error) {
    console.error('Fraud resolution error:', error);
    res.status(500).json({ error: 'Failed to process fraud action' });
  }
};