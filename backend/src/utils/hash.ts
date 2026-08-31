import crypto from 'crypto';

export const generateRecordHash = (record: any): string => {
  // We stringify the essential financial fields to create a unique fingerprint.
  // If a single penny changes in the future, the hash will completely change.
  const dataString = JSON.stringify({
    loanId: record.loanId,
    borrowerId: record.borrowerId,
    currentBalance: record.currentBalance,
    paymentStatus: record.paymentStatus,
    interestRate: record.interestRate
  });
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
};