-- CreateEnum
CREATE TYPE "GuidanceWalkthroughStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "GuidanceState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyExpansionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "walkthroughStatus" "GuidanceWalkthroughStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "walkthroughStep" INTEGER NOT NULL DEFAULT 0,
    "dismissedTipIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuidanceState_userId_key" ON "GuidanceState"("userId");

-- CreateIndex
CREATE INDEX "GuidanceState_updatedAt_idx" ON "GuidanceState"("updatedAt");

-- AddForeignKey
ALTER TABLE "GuidanceState" ADD CONSTRAINT "GuidanceState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
