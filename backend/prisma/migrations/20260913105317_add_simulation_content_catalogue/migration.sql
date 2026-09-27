-- CreateTable
CREATE TABLE "SimulationObligationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT 'v1',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "basePoints" DECIMAL(12,2) NOT NULL,
    "savingsPointsFactor" DECIMAL(5,2) NOT NULL DEFAULT 0.8,
    "selectionWeight" INTEGER NOT NULL DEFAULT 1,
    "eligibleForEventIntroduction" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationObligationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEventTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT 'v1',
    "triggerDay" INTEGER NOT NULL,
    "eventSnapshot" JSONB NOT NULL,
    "selectionWeight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationEventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationObligationTemplate_code_key" ON "SimulationObligationTemplate"("code");

-- CreateIndex
CREATE INDEX "SimulationObligationTemplate_isActive_selectionWeight_idx" ON "SimulationObligationTemplate"("isActive", "selectionWeight");

-- CreateIndex
CREATE INDEX "SimulationObligationTemplate_isActive_dueDay_idx" ON "SimulationObligationTemplate"("isActive", "dueDay");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationEventTemplate_code_key" ON "SimulationEventTemplate"("code");

-- CreateIndex
CREATE INDEX "SimulationEventTemplate_isActive_selectionWeight_idx" ON "SimulationEventTemplate"("isActive", "selectionWeight");

-- CreateIndex
CREATE INDEX "SimulationEventTemplate_isActive_triggerDay_idx" ON "SimulationEventTemplate"("isActive", "triggerDay");
