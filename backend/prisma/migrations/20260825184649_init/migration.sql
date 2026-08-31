-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RawUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawRowCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RawUpload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanRecordRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "rawData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanRecordRaw_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "RawUpload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanRecordNormalized" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawRecordId" TEXT NOT NULL,
    "loanId" TEXT,
    "borrowerId" TEXT,
    "loanType" TEXT,
    "originationDate" DATETIME,
    "maturityDate" DATETIME,
    "originalPrincipal" REAL,
    "currentBalance" REAL,
    "interestRate" REAL,
    "termMonths" INTEGER,
    "borrowerState" TEXT,
    "loanPurpose" TEXT,
    "creditGrade" TEXT,
    "employmentLength" TEXT,
    "incomeBand" TEXT,
    "paymentStatus" TEXT,
    "daysPastDue" INTEGER,
    "servicerName" TEXT,
    "lastPaymentDate" DATETIME,
    "lastUpdatedAt" DATETIME,
    "documentStatus" TEXT,
    "sourceSystem" TEXT,
    CONSTRAINT "LoanRecordNormalized_rawRecordId_fkey" FOREIGN KEY ("rawRecordId") REFERENCES "LoanRecordRaw" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "config" TEXT
);

-- CreateTable
CREATE TABLE "Exception" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedRecordId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exception_normalizedRecordId_fkey" FOREIGN KEY ("normalizedRecordId") REFERENCES "LoanRecordNormalized" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exception_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ValidationRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewerAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exceptionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewerAction_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "Exception" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewerAction_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exceptionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRecommendation_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "Exception" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerifiedLoan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedRecordId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "aiRecommendationId" TEXT,
    "recordHash" TEXT NOT NULL,
    "validationResult" TEXT NOT NULL,
    "reviewerDecision" TEXT NOT NULL,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerifiedLoan_normalizedRecordId_fkey" FOREIGN KEY ("normalizedRecordId") REFERENCES "LoanRecordNormalized" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VerifiedLoan_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VerifiedLoan_aiRecommendationId_fkey" FOREIGN KEY ("aiRecommendationId") REFERENCES "AiRecommendation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actionType" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRecordNormalized_rawRecordId_key" ON "LoanRecordNormalized"("rawRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedLoan_normalizedRecordId_key" ON "VerifiedLoan"("normalizedRecordId");
