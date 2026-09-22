-- CreateEnum
CREATE TYPE "PaymentContributionSource" AS ENUM ('MANUAL', 'RECEIPT_SCAN');

-- CreateEnum
CREATE TYPE "PaymentContributionState" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ReceiptScanStatus" AS ENUM ('READY_FOR_REVIEW', 'CONSUMED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "PaymentOccurrenceStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterTable
ALTER TABLE "PaymentOccurrence" ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ScoreEvent" ADD COLUMN     "paymentContributionId" TEXT;

-- CreateTable
CREATE TABLE "PaymentContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL,
    "source" "PaymentContributionSource" NOT NULL,
    "state" "PaymentContributionState" NOT NULL DEFAULT 'POSTED',
    "receiptScanId" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestPayloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedByUserId" TEXT,

    CONSTRAINT "PaymentContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReceiptScanStatus" NOT NULL DEFAULT 'READY_FOR_REVIEW',
    "preselectedOccurrenceId" TEXT,
    "extraction" JSONB NOT NULL,
    "warnings" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentContribution_receiptScanId_key" ON "PaymentContribution"("receiptScanId");

-- CreateIndex
CREATE INDEX "PaymentContribution_occurrenceId_state_createdAt_idx" ON "PaymentContribution"("occurrenceId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentContribution_userId_createdAt_idx" ON "PaymentContribution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentContribution_obligationId_idx" ON "PaymentContribution"("obligationId");

-- CreateIndex
CREATE INDEX "PaymentContribution_state_idx" ON "PaymentContribution"("state");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentContribution_userId_idempotencyKey_key" ON "PaymentContribution"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ReceiptScan_userId_expiresAt_idx" ON "ReceiptScan"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ReceiptScan_status_expiresAt_idx" ON "ReceiptScan"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentContribution" ADD CONSTRAINT "PaymentContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentContribution" ADD CONSTRAINT "PaymentContribution_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "PaymentOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentContribution" ADD CONSTRAINT "PaymentContribution_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentContribution" ADD CONSTRAINT "PaymentContribution_receiptScanId_fkey" FOREIGN KEY ("receiptScanId") REFERENCES "ReceiptScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptScan" ADD CONSTRAINT "ReceiptScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptScan" ADD CONSTRAINT "ReceiptScan_preselectedOccurrenceId_fkey" FOREIGN KEY ("preselectedOccurrenceId") REFERENCES "PaymentOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_paymentContributionId_fkey" FOREIGN KEY ("paymentContributionId") REFERENCES "PaymentContribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Legacy payment data backfill
-- ============================================================================

-- Copy every active legacy PaymentRecord into PaymentContribution.
--
-- We reuse the PaymentRecord ID as the PaymentContribution ID so that
-- historical ScoreEvent relationships can be migrated deterministically.
--
-- Existing PaymentRecord rows remain in place during the staged migration.
INSERT INTO "PaymentContribution" (
    "id",
    "userId",
    "occurrenceId",
    "obligationId",
    "amount",
    "currency",
    "paidDate",
    "source",
    "state",
    "receiptScanId",
    "notes",
    "idempotencyKey",
    "requestPayloadHash",
    "createdAt",
    "updatedAt",
    "voidedAt",
    "voidReason",
    "voidedByUserId"
)
SELECT
    pr."id",
    pr."userId",
    pr."occurrenceId",
    pr."obligationId",
    pr."amountPaid",
    pr."currency",
    pr."paidDate",
    'MANUAL'::"PaymentContributionSource",
    'POSTED'::"PaymentContributionState",
    NULL,
    pr."notes",

    -- Existing PaymentRecord IDs are UUIDs, so they are suitable deterministic
    -- migration-only idempotency keys.
    pr."id",

    -- Historical records did not have request payload hashes.
    -- This deterministic marker is only for migrated legacy data.
    'legacy:' || pr."id",

    pr."createdAt",
    pr."updatedAt",
    NULL,
    NULL,
    NULL
FROM "PaymentRecord" pr
WHERE pr."deletedAt" IS NULL;

UPDATE "PaymentOccurrence" po
SET "amountPaid" = COALESCE(
    (
        SELECT SUM(pc."amount")
        FROM "PaymentContribution" pc
        WHERE pc."occurrenceId" = po."id"
          AND pc."state" = 'POSTED'
    ),
    0
);

UPDATE "ScoreEvent" se
SET "paymentContributionId" = se."paymentRecordId"
WHERE se."paymentRecordId" IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM "PaymentContribution" pc
      WHERE pc."id" = se."paymentRecordId"
  );

DO $$
BEGIN

    -- Every non-deleted legacy payment must have been migrated.
    IF EXISTS (
        SELECT 1
        FROM "PaymentRecord" pr
        LEFT JOIN "PaymentContribution" pc
            ON pc."id" = pr."id"
        WHERE pr."deletedAt" IS NULL
          AND pc."id" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Payment migration failed: one or more active PaymentRecord rows were not migrated';
    END IF;


    -- amountPaid must never exceed amountDue.
    IF EXISTS (
        SELECT 1
        FROM "PaymentOccurrence"
        WHERE "amountPaid" > "amountDue"
    ) THEN
        RAISE EXCEPTION
            'Payment migration failed: amountPaid exceeds amountDue';
    END IF;


    -- amountPaid must equal the sum of POSTED contributions.
    IF EXISTS (
        SELECT 1
        FROM "PaymentOccurrence" po
        WHERE po."amountPaid" <> COALESCE(
            (
                SELECT SUM(pc."amount")
                FROM "PaymentContribution" pc
                WHERE pc."occurrenceId" = po."id"
                  AND pc."state" = 'POSTED'
            ),
            0
        )
    ) THEN
        RAISE EXCEPTION
            'Payment migration failed: amountPaid does not match posted contribution total';
    END IF;


    -- Historically completed occurrences should still be fully settled.
    IF EXISTS (
        SELECT 1
        FROM "PaymentOccurrence"
        WHERE "status" IN ('PAID', 'PAID_LATE')
          AND "amountPaid" <> "amountDue"
    ) THEN
        RAISE EXCEPTION
            'Payment migration failed: completed occurrence is not fully settled';
    END IF;


    -- Existing payment-linked score events must have a migrated contribution.
    IF EXISTS (
        SELECT 1
        FROM "ScoreEvent" se
        JOIN "PaymentRecord" pr
            ON pr."id" = se."paymentRecordId"
        LEFT JOIN "PaymentContribution" pc
            ON pc."id" = se."paymentContributionId"
        WHERE se."paymentRecordId" IS NOT NULL
          AND pr."deletedAt" IS NULL
          AND pc."id" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Payment migration failed: historical ScoreEvent contribution link missing';
    END IF;

END $$;