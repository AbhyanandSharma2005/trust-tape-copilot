// backend/src/services/validationEngine.ts
import { PrismaClient, LoanRecordNormalized, ValidationRule } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Define modular rule functions (Isolated & Testable)
type RuleFunction = (record: LoanRecordNormalized) => boolean;

const ruleImplementations: Record<string, RuleFunction> = {
  missing_loan_id: (r) => !r.loanId || r.loanId.trim() === '',
  negative_balance: (r) => r.currentBalance !== null && r.currentBalance < 0,
  balance_exceeds_original: (r) => (r.currentBalance !== null && r.originalPrincipal !== null) && (r.currentBalance > r.originalPrincipal),
  maturity_before_origination: (r) => (r.maturityDate !== null && r.originationDate !== null) && (r.maturityDate < r.originationDate),
  interest_rate_out_of_range: (r) => (r.interestRate !== null) && (r.interestRate < 2.0 || r.interestRate > 9.0),
  closed_loan_positive_balance: (r) => {
    if (r.currentBalance === null || !r.paymentStatus) return false;
    const status = r.paymentStatus.toLowerCase();
    return (status === 'closed_paid' || status === 'closed_default') && r.currentBalance > 0;
  },
  invalid_state_code: (r) => r.borrowerState !== null && r.borrowerState.length !== 2,
};

// 2. The Engine: Runs rules against records and writes Exceptions
export const runValidationForUpload = async (uploadId: string, operatorId: string) => {
  console.log(`Starting validation for upload: ${uploadId}`);

  // Fetch all normalized records for this upload
  const records = await prisma.loanRecordNormalized.findMany({
    where: { rawRecord: { uploadId: uploadId } }
  });

  // Fetch active rules from the database (so we get the correct severities)
  const activeRules = await prisma.validationRule.findMany();
  
  let exceptionsCreated = 0;
  const exceptionsToInsert: any[] = [];

  // 3. Evaluate each record against each active rule
  for (const record of records) {
    for (const rule of activeRules) {
      const checkRule = ruleImplementations[rule.id];
      
      // If the rule triggers (returns true), it's an exception
      if (checkRule && checkRule(record)) {
        exceptionsToInsert.push({
          normalizedRecordId: record.id,
          ruleId: rule.id,
          severity: rule.severity,
          status: 'open'
        });
      }
    }
  }

  // 4. Batch insert all detected exceptions
  if (exceptionsToInsert.length > 0) {
    await prisma.exception.createMany({
      data: exceptionsToInsert
    });
    exceptionsCreated = exceptionsToInsert.length;
  }

  // 5. Immutable Audit Log (Traceability)
  await prisma.auditLog.create({
    data: {
      actorId: operatorId,
      actionType: 'validation_executed',
      entity: 'RawUpload',
      entityId: uploadId,
      metadata: JSON.stringify({ recordsScanned: records.length, exceptionsFound: exceptionsCreated })
    }
  });

  return { recordsScanned: records.length, exceptionsFound: exceptionsCreated };
};