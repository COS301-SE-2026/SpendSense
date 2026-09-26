ALTER TYPE "SimulationPresentationHold" ADD VALUE 'NEW_OBLIGATION';
ALTER TABLE "SimulationObligationSchedule" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
