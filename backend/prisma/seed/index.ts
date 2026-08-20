import { PrismaClient } from '@prisma/client';
import { seedBadges } from './badges';
import { seedCategories } from './categories';
import { seedQuizzes } from './quizzes';
import { seedCosmetics } from './cosmetics';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding required SpendSense reference data...');
  await seedCategories(prisma);
  await seedBadges(prisma);
  await seedQuizzes(prisma);
  await seedCosmetics(prisma);
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
