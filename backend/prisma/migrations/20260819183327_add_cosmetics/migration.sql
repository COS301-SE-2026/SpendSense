-- CreateEnum
CREATE TYPE "CosmeticSlot" AS ENUM ('HAT', 'ACCESSORY');

-- CreateTable
CREATE TABLE "CosmeticItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "CosmeticSlot" NOT NULL,
    "cost" INTEGER NOT NULL,
    "iconKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosmeticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cosmeticItemId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticItem_code_key" ON "CosmeticItem"("code");

-- CreateIndex
CREATE INDEX "CosmeticItem_slot_isActive_idx" ON "CosmeticItem"("slot", "isActive");

-- CreateIndex
CREATE INDEX "UserInventoryItem_userId_equipped_idx" ON "UserInventoryItem"("userId", "equipped");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventoryItem_userId_cosmeticItemId_key" ON "UserInventoryItem"("userId", "cosmeticItemId");

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_cosmeticItemId_fkey" FOREIGN KEY ("cosmeticItemId") REFERENCES "CosmeticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
