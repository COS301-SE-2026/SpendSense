import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { resetE2eDatabase } from '../../../test-support/database/reset';
import { createUser } from '../../../test-support/factories/user';
import { seedBadges } from '../../prisma/seed/badges';
import { seedCategories } from '../../prisma/seed/categories';
import { seedQuizzes } from '../../prisma/seed/quizzes';
import { seedCosmetics } from '../../prisma/seed/cosmetics';

async function resetAndSeed(prisma: PrismaClient): Promise<void> {
  await resetE2eDatabase(prisma);
  await seedCategories(prisma);
  await seedBadges(prisma);
  await seedQuizzes(prisma);
  await seedCosmetics(prisma);
}

export async function createApiE2eFixture() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const prisma = new PrismaClient();
  await prisma.$connect();
  await resetAndSeed(prisma);

  return {
    app,
    prisma,
    request: request(app.getHttpServer()),
    reset: () => resetAndSeed(prisma),
    async user() {
      const user = (await createUser(prisma)) as {
        supabaseAuthId: string;
        email: string;
      };
      const token = await createE2eAccessToken(user);
      return {
        user,
        token,
        api: request(app.getHttpServer()),
      };
    },
    async close() {
      await prisma.$disconnect();
      await app.close();
    },
  };
}
