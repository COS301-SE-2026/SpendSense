import { CosmeticSlot, PrismaClient } from '@prisma/client';

export const defaultCosmetics = [
  {
    code: 'party_hat',
    name: 'Party Hat',
    slot: CosmeticSlot.HAT,
    cost: 50,
    iconKey: 'hat_party',
    isActive: true,
  },
  {
    code: 'medal',
    name: 'Medal',
    slot: CosmeticSlot.ACCESSORY,
    cost: 50,
    iconKey: 'acc_medal',
    isActive: true,
  },
  {
    code: 'cross_body_bag',
    name: 'Cross Body Bag',
    slot: CosmeticSlot.ACCESSORY,
    cost: 75,
    iconKey: 'acc_cbb',
    isActive: true,
  },
  {
    code: 'bucket_hat',
    name: 'Bucket Hat',
    slot: CosmeticSlot.HAT,
    cost: 75,
    iconKey: 'hat_bucket',
    isActive: true,
  },
  {
    code: 'sunglasses',
    name: 'Sunglasses',
    slot: CosmeticSlot.HAT,
    cost: 75,
    iconKey: 'hat_sunglasses',
    isActive: true,
  },
  {
    code: 'crown',
    name: 'Crown',
    slot: CosmeticSlot.HAT,
    cost: 150,
    iconKey: 'hat_crown',
    isActive: true,
  },
  {
    code: 'hoodie',
    name: 'Hoodie',
    slot: CosmeticSlot.ACCESSORY,
    cost: 150,
    iconKey: 'acc_hoodie',
    isActive: true,
  },
];

export async function seedCosmetics(prisma: PrismaClient) {
  for (const item of defaultCosmetics) {
    await prisma.cosmeticItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }
}
