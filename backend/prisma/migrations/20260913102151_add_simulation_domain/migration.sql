-- CreateEnum
CREATE TYPE "SimulationSessionStatus" AS ENUM ('BRIEFING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SimulationObligationStatus" AS ENUM ('SCHEDULED', 'PAYABLE', 'PAID', 'MISSED');

-- CreateEnum
CREATE TYPE "SimulationEventStatus" AS ENUM ('SCHEDULED', 'REVEALED', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SimulationScoreSourceType" AS ENUM ('OBLIGATION_PAYMENT', 'OBLIGATION_MISSED', 'EVENT_DECISION', 'EVENT_EXPIRY', 'FEE_OR_DEBT', 'FINAL_BUDGET_BONUS');

-- CreateEnum
CREATE TYPE "SimulationActionType" AS ENUM ('SETUP', 'ADVANCE_DAY', 'PAY_OBLIGATION', 'RESOLVE_EVENT', 'CONTINUE', 'CHANGE_STATUS', 'DISCARD');

-- CreateEnum
CREATE TYPE "SimulationPresentationHold" AS ENUM ('NONE', 'PAYMENT_RESULT', 'EVENT_REVEAL', 'EVENT_RESULT', 'SUMMARY');

-- AlterEnum
ALTER TYPE "BadgeCriteriaType" ADD VALUE 'SIMULATION_COMPLETION_COUNT';

-- AlterEnum
ALTER TYPE "UserEventSourceType" ADD VALUE 'SIMULATION_SESSION';

-- AlterEnum
ALTER TYPE "UserEventType" ADD VALUE 'SIMULATION_COMPLETED';

-- CreateTable
CREATE TABLE "SimulationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SimulationSessionStatus" NOT NULL DEFAULT 'BRIEFING',
    "scenarioVersion" TEXT NOT NULL,
    "scenarioSnapshot" JSONB NOT NULL,
    "timedMode" BOOLEAN NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "daysInMonth" INTEGER NOT NULL DEFAULT 30,
    "startingBudget" DECIMAL(12,2) NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL,
    "savingsBalance" DECIMAL(12,2) NOT NULL,
    "savingsRetentionMultiplier" DECIMAL(5,2) NOT NULL,
    "score" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nextDayAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedDecisionSeconds" INTEGER,
    "presentationHold" "SimulationPresentationHold" NOT NULL DEFAULT 'NONE',
    "completionRewardGrantedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationObligation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "introducedByEventId" TEXT,
    "status" "SimulationObligationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "paidAt" TIMESTAMP(3),
    "currentUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "savingsUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pointsAwarded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "consequenceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "triggerDay" INTEGER NOT NULL,
    "status" "SimulationEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "eventSnapshot" JSONB NOT NULL,
    "revealedAt" TIMESTAMP(3),
    "decisionExpiresAt" TIMESTAMP(3),
    "selectedOptionId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScoreEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceType" "SimulationScoreSourceType" NOT NULL,
    "sourceId" TEXT,
    "simulatedDay" INTEGER NOT NULL,
    "pointsDelta" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "calculationData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationScoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" "SimulationActionType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "responseSnapshot" JSONB,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulationSession_userId_status_updatedAt_idx" ON "SimulationSession"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SimulationSession_status_nextDayAt_idx" ON "SimulationSession"("status", "nextDayAt");

-- CreateIndex
CREATE INDEX "SimulationSession_expiresAt_idx" ON "SimulationSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SimulationObligation_sessionId_dueDay_status_idx" ON "SimulationObligation"("sessionId", "dueDay", "status");

-- CreateIndex
CREATE INDEX "SimulationObligation_introducedByEventId_idx" ON "SimulationObligation"("introducedByEventId");

-- CreateIndex
CREATE INDEX "SimulationEvent_sessionId_triggerDay_status_idx" ON "SimulationEvent"("sessionId", "triggerDay", "status");

-- CreateIndex
CREATE INDEX "SimulationEvent_status_decisionExpiresAt_idx" ON "SimulationEvent"("status", "decisionExpiresAt");

-- CreateIndex
CREATE INDEX "SimulationScoreEntry_sessionId_simulatedDay_createdAt_idx" ON "SimulationScoreEntry"("sessionId", "simulatedDay", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationScoreEntry_sourceType_idx" ON "SimulationScoreEntry"("sourceType");

-- CreateIndex
CREATE INDEX "SimulationAction_sessionId_actionType_committedAt_idx" ON "SimulationAction"("sessionId", "actionType", "committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationAction_sessionId_idempotencyKey_key" ON "SimulationAction"("sessionId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "SimulationSession" ADD CONSTRAINT "SimulationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationObligation" ADD CONSTRAINT "SimulationObligation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationObligation" ADD CONSTRAINT "SimulationObligation_introducedByEventId_fkey" FOREIGN KEY ("introducedByEventId") REFERENCES "SimulationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScoreEntry" ADD CONSTRAINT "SimulationScoreEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAction" ADD CONSTRAINT "SimulationAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
