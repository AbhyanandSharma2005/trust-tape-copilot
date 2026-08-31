export const evaluateReconstructionLoss = (record: any): { score: number, flaggedFields: string[] } => {
  let lossScore = 0;
  const flaggedFields: string[] = [];

  const balance = parseFloat(record.current_balance);
  const rate = parseFloat(record.interest_rate);
  const creditGrade = record.credit_grade?.toUpperCase();

  // Simulate latent space mapping: High balance + high interest + high grade = distributional anomaly
  if (!isNaN(balance) && !isNaN(rate)) {
    const normalizedBalance = Math.min(balance / 1000000, 1); 
    const normalizedRate = rate / 100;
    
    // Simulate high KL-divergence from the expected prior distribution
    if (creditGrade === 'A' && normalizedRate > 0.15) {
      lossScore += 0.45;
      flaggedFields.push('interest_rate', 'credit_grade');
    }
    
    // Simulate non-linear reconstruction error
    const expectedRate = creditGrade === 'A' ? 0.05 : (creditGrade === 'B' ? 0.08 : 0.12);
    const deviation = Math.abs(normalizedRate - expectedRate);
    
    lossScore += (deviation * 5); 
    if (deviation > 0.05) flaggedFields.push('interest_rate');
  }

  // Cap the maximum anomaly score at 0.99
  const finalScore = Math.min(lossScore, 0.99);
  return { score: finalScore, flaggedFields: [...new Set(flaggedFields)] };
};