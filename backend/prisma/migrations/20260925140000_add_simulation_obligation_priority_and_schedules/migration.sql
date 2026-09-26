CREATE TYPE "SimulationObligationImportance" AS ENUM (
  'CRITICAL',
  'HIGH',
  'STANDARD',
  'LOW'
);

CREATE TYPE "SimulationObligationScheduleStatus" AS ENUM (
  'SCHEDULED',
  'MATERIALIZED'
);

ALTER TABLE "SimulationObligationTemplate"
ADD COLUMN "importance" "SimulationObligationImportance" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "importanceWeight" DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
ADD COLUMN "baseMissPenalty" DECIMAL(12, 2) NOT NULL DEFAULT 20.0;

CREATE TABLE "SimulationObligationSchedule" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "scheduleKey" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "triggerDay" INTEGER NOT NULL,
  "status" "SimulationObligationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
  "obligationSnapshot" JSONB NOT NULL,
  "materializedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SimulationObligationSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SimulationObligationSchedule_triggerDay_check" CHECK ("triggerDay" BETWEEN 1 AND 30)
);

ALTER TABLE "SimulationObligation"
ADD COLUMN "introducedByScheduleId" TEXT;

CREATE UNIQUE INDEX "SimulationObligationSchedule_sessionId_scheduleKey_key"
ON "SimulationObligationSchedule"("sessionId", "scheduleKey");

CREATE INDEX "SimulationObligationSchedule_sessionId_triggerDay_status_idx"
ON "SimulationObligationSchedule"("sessionId", "triggerDay", "status");

CREATE UNIQUE INDEX "SimulationObligation_introducedByScheduleId_key"
ON "SimulationObligation"("introducedByScheduleId");

ALTER TABLE "SimulationObligationSchedule"
ADD CONSTRAINT "SimulationObligationSchedule_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SimulationObligation"
ADD CONSTRAINT "SimulationObligation_introducedByScheduleId_fkey"
FOREIGN KEY ("introducedByScheduleId") REFERENCES "SimulationObligationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
