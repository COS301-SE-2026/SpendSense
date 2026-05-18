import { PrismaClient } from '@prisma/client';
import { seedBadges } from './badges';
import { seedCategories } from './categories';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding required SpendSense reference data...');
  await seedCategories(prisma);
  await seedBadges(prisma);
  console.log('Required seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
