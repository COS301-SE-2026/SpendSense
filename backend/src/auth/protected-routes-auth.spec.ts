jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  decodeProtectedHeader: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { SupabaseJwtGuard } from './guards/supabase-jwt.guard';
import { CategoriesController } from '../categories/categories.controller';
import { CategoriesService } from '../categories/categories.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';

describe('Protected route auth errors', () => {
  let app: INestApplication<App>;

  const usersService = {
    findOrCreateUser: jest.fn(),
  };
  const categoriesService = {
    listCategories: jest.fn(),
  };

  const decodeProtectedHeaderMock = jest.mocked(decodeProtectedHeader);
  const jwtVerifyMock = jest.mocked(jwtVerify);
  const originalSecret = process.env.SUPABASE_JWT_SECRET;

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController, CategoriesController],
      providers: [
        SupabaseJwtGuard,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    usersService.findOrCreateUser.mockReset();
    categoriesService.listCategories.mockReset();
    decodeProtectedHeaderMock.mockReset();
    jwtVerifyMock.mockReset();
    decodeProtectedHeaderMock.mockReturnValue({ alg: 'HS256' });
  });

  afterAll(async () => {
    await app.close();

    if (originalSecret === undefined) {
      delete process.env.SUPABASE_JWT_SECRET;
      return;
    }

    process.env.SUPABASE_JWT_SECRET = originalSecret;
  });

  it.each(['/api/v1/users/me', '/api/v1/categories'])(
    'returns a consistent 401 response for missing auth on %s',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Missing or malformed Authorization header',
        timestamp: expect.any(String) as string,
        path,
      });
      expect(usersService.findOrCreateUser).not.toHaveBeenCalled();
      expect(categoriesService.listCategories).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/v1/users/me', '/api/v1/categories'])(
    'returns a consistent 401 response for malformed auth on %s',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Token abc123')
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Missing or malformed Authorization header',
        timestamp: expect.any(String) as string,
        path,
      });
      expect(usersService.findOrCreateUser).not.toHaveBeenCalled();
      expect(categoriesService.listCategories).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/v1/users/me', '/api/v1/categories'])(
    'returns a consistent 401 response for invalid tokens on %s',
    async (path) => {
      jwtVerifyMock.mockRejectedValue(new Error('bad token'));

      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid or expired token',
        timestamp: expect.any(String) as string,
        path,
      });
      expect(usersService.findOrCreateUser).not.toHaveBeenCalled();
      expect(categoriesService.listCategories).not.toHaveBeenCalled();
    },
  );
});
