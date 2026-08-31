import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csvParser from 'csv-parser';
import { randomUUID } from 'crypto';
import { parseDate, parseNumber, parseString } from '../utils/normalize';
import { evaluateReconstructionLoss } from '../services/vaeService';

const prisma = new PrismaClient();

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    // 1. Get our mock Data Operator
    const operator = await prisma.user.findFirst({ where: { role: 'data_operator' } });
    if (!operator) throw new Error("No data operator found. Did you run the seed script?");

    // 2. Create the Raw Upload Record
    const rawUpload = await prisma.rawUpload.create({
      data: {
        filename: req.file.originalname,
        uploaderId: operator.id,
        status: 'processing',
      },
    });

    // 3. Parse the CSV File into memory
    const results: any[] = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    let successCount = 0;
    let failCount = 0;

    // We will store the parsed rows in memory, then batch-insert them!
    const rawRecordsToInsert = [];
    const normalizedRecordsToInsert = [];

    // 4. Map the data efficiently
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Generate the ID manually so we can link the two tables in a batch insert
        const rawRecordId = randomUUID();

        // Step A: Queue Raw Data
        rawRecordsToInsert.push({
          id: rawRecordId, 
          uploadId: rawUpload.id,
          sourceRowNumber: i + 2, 
          rawData: JSON.stringify(row),
        });

        // Step B: Queue Normalized Data
        normalizedRecordsToInsert.push({
          rawRecordId: rawRecordId, // The exact relational link!
          loanId: parseString(row.loan_id),
          borrowerId: parseString(row.borrower_id),
          loanType: parseString(row.loan_type),
          originationDate: parseDate(row.origination_date),
          maturityDate: parseDate(row.maturity_date),
          originalPrincipal: parseNumber(row.original_principal),
          currentBalance: parseNumber(row.current_balance),
          interestRate: parseNumber(row.interest_rate),
          termMonths: parseNumber(row.term_months),
          borrowerState: parseString(row.borrower_state),
          loanPurpose: parseString(row.loan_purpose),
          creditGrade: parseString(row.credit_grade),
          employmentLength: parseString(row.employment_length),
          incomeBand: parseString(row.income_band),
          paymentStatus: parseString(row.payment_status),
          daysPastDue: parseNumber(row.days_past_due),
          servicerName: parseString(row.servicer_name),
          lastPaymentDate: parseDate(row.last_payment_date),
          lastUpdatedAt: parseDate(row.last_updated_at),
          documentStatus: parseString(row.document_status),
          sourceSystem: parseString(row.source_system),
        });

        successCount++;
      } catch (err) {
        console.error(`Row ${i + 2} failed ingestion mapping:`, err);
        failCount++;
      }
    }

    // 5. ENTERPRISE BATCH INSERT (100x Faster)
    if (rawRecordsToInsert.length > 0) {
      await prisma.loanRecordRaw.createMany({ data: rawRecordsToInsert });
      await prisma.loanRecordNormalized.createMany({ data: normalizedRecordsToInsert });
    }

    // 6. Update Upload Status
    await prisma.rawUpload.update({
      where: { id: rawUpload.id },
      data: { status: 'completed', rawRowCount: results.length },
    });

    // NEW: Generate an automated system alert based on failure volume
    const errorRate = (failCount / results.length) * 100;
    
    await prisma.alert.create({
      data: {
        severity: errorRate > 10 ? 'CRITICAL' : (failCount > 0 ? 'WARNING' : 'SUCCESS'),
        message: errorRate > 10 
          ? `High risk detected: Tape ${req.file.originalname} has a ${errorRate.toFixed(1)}% ingestion failure rate.`
          : `Tape ${req.file.originalname} processed with ${failCount} errors.`,
        referenceId: rawUpload.id
      }
    });

    // 7. Write to Immutable Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: operator.id,
        actionType: 'file_uploaded',
        entity: 'RawUpload',
        entityId: rawUpload.id,
        metadata: JSON.stringify({ filename: req.file.originalname, totalRows: results.length, successCount, failCount }),
      }
    });

    // 8. Cleanup temp file
    fs.unlinkSync(req.file.path);

    // 9. INSTANT UI FEEDBACK (Unblock the browser!)
    res.json({
      message: 'Upload successful. Processing validation in background.',
      uploadId: rawUpload.id,
      ingestion: {
        totalRows: results.length,
        successCount,
        failCount
      }
    });

    // 10. ASYNCHRONOUS HAND-OFF
    // Notice there is NO 'await' here. The server responds to the user, then quietly crunches the heavy rules.
    runValidationForUpload(rawUpload.id, operator.id).catch(err => {
      console.error(`Background validation failed for ${rawUpload.id}:`, err);
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
};

// NEW: Enhanced validation function with VAE anomaly detection
export const runValidationForUpload = async (uploadId: string, operatorId: string) => {
  try {
    // Get all normalized records for this upload
    const normalizedRecords = await prisma.loanRecordNormalized.findMany({
      where: {
        rawRecord: {
          uploadId: uploadId
        }
      },
      include: {
        rawRecord: true
      }
    });

    let hasError = false;
    const rowExceptions = [];
    const rulesCache = new Map();

    // Process each record through static and ML validation
    for (const record of normalizedRecords) {
      const row = record.rawRecord?.rawData ? JSON.parse(record.rawRecord.rawData) : {};
      const validationResults = [];

      // 1. STATIC RULE VALIDATION
      // Check for required fields
      const requiredFields = ['loan_id', 'borrower_id', 'original_principal', 'interest_rate'];
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          hasError = true;
          let rule = rulesCache.get('REQUIRED_001');
          if (!rule) {
            rule = await prisma.validationRule.findUnique({ where: { id: 'REQUIRED_001' } });
            if (!rule) {
              rule = await prisma.validationRule.create({
                data: {
                  id: 'REQUIRED_001',
                  description: 'Required field cannot be empty',
                  severity: 'ERROR'
                }
              });
            }
            rulesCache.set('REQUIRED_001', rule);
          }
          validationResults.push({
            ruleId: rule.id,
            status: 'open',
            severity: 'ERROR',
            metadata: JSON.stringify({ field, value: row[field] })
          });
        }
      }

      // Check for negative principal - use null coalescing to default to 0 if null
      if ((parseNumber(row.original_principal) ?? 0) < 0) {
        hasError = true;
        let rule = rulesCache.get('PRINCIPAL_001');
        if (!rule) {
          rule = await prisma.validationRule.findUnique({ where: { id: 'PRINCIPAL_001' } });
          if (!rule) {
            rule = await prisma.validationRule.create({
              data: {
                id: 'PRINCIPAL_001',
                description: 'Principal amount cannot be negative',
                severity: 'ERROR'
              }
            });
          }
          rulesCache.set('PRINCIPAL_001', rule);
        }
        validationResults.push({
          ruleId: rule.id,
          status: 'open',
          severity: 'ERROR',
          metadata: JSON.stringify({ 
            field: 'original_principal', 
            value: row.original_principal,
            expected: '>= 0'
          })
        });
      }

      // Check for valid interest rate (0-100%) - only check if not null
      const interestRate = parseNumber(row.interest_rate);
      if (interestRate !== null && (interestRate < 0 || interestRate > 100)) {
        hasError = true;
        let rule = rulesCache.get('INTEREST_001');
        if (!rule) {
          rule = await prisma.validationRule.findUnique({ where: { id: 'INTEREST_001' } });
          if (!rule) {
            rule = await prisma.validationRule.create({
              data: {
                id: 'INTEREST_001',
                description: 'Interest rate must be between 0 and 100',
                severity: 'ERROR'
              }
            });
          }
          rulesCache.set('INTEREST_001', rule);
        }
        validationResults.push({
          ruleId: rule.id,
          status: 'open',
          severity: 'ERROR',
          metadata: JSON.stringify({ 
            field: 'interest_rate', 
            value: row.interest_rate,
            expected: '0-100'
          })
        });
      }

      // 2. VAE GENERATIVE ANOMALY DETECTION
      // NEW: VAE Generative Anomaly Detection
      const anomalyResult = evaluateReconstructionLoss(row);
      
      // If reconstruction loss implies an 85%+ anomaly probability, flag it
      if (anomalyResult.score > 0.85) {
        // Ensure the ML dynamic rule exists in the DB
        let mlRule = await prisma.validationRule.findUnique({ where: { id: 'AI_ANOMALY_01' } });
        if (!mlRule) {
          mlRule = await prisma.validationRule.create({
            data: {
              id: 'AI_ANOMALY_01',
              description: 'Generative AI flagged a multi-variable distribution anomaly based on high reconstruction loss.',
              severity: 'CRITICAL'
            }
          });
        }

        validationResults.push({
          ruleId: mlRule.id,
          status: 'open',
          severity: 'CRITICAL',
          metadata: JSON.stringify({ 
            anomalyScore: anomalyResult.score.toFixed(2), 
            suspectFields: anomalyResult.flaggedFields 
          })
        });
        hasError = true;
      }

      // If there are validation results, create exception records
      if (validationResults.length > 0) {
        for (const validation of validationResults) {
          await prisma.exception.create({
            data: {
              normalizedRecordId: record.id,
              ruleId: validation.ruleId,
              status: validation.status,
              severity: validation.severity,
              metadata: validation.metadata
            }
          });
        }
      }
    }

    // Update upload status based on validation results
    await prisma.rawUpload.update({
      where: { id: uploadId },
      data: {
        status: hasError ? 'completed_with_errors' : 'completed'
      }
    });

    // Create audit log entry for validation completion
    await prisma.auditLog.create({
      data: {
        actorId: operatorId,
        actionType: 'validation_completed',
        entity: 'RawUpload',
        entityId: uploadId,
        metadata: JSON.stringify({ 
          totalRecords: normalizedRecords.length,
          hasErrors: hasError,
          exceptionCount: rowExceptions.length
        })
      }
    });

    return { success: true, hasErrors: hasError, exceptionCount: rowExceptions.length };

  } catch (error) {
    console.error(`Validation failed for upload ${uploadId}:`, error);
    
    // Update upload status to failed
    await prisma.rawUpload.update({
      where: { id: uploadId },
      data: { status: 'validation_failed' }
    });

    throw error;
  }
};