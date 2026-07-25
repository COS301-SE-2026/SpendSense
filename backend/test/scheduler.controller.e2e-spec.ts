import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('SchedulerController (e2e)', () => {
  let app: INestApplication<App>;

  const originalSecret = process.env.SCHEDULER_SECRET;

  beforeEach(async () => {
    process.env.SCHEDULER_SECRET = 'e2e-tester-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SCHEDULER_SECRET;

      return;
    }
    process.env.SCHEDULER_SECRET = originalSecret;
  });

  it('will reject requests with incorrect secret header with 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/scheduler/run')
      .set('x-scheduler-secret', 'incorrect-value')
      .expect(401);
  });

  it('will reject requests with no secret header with 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/scheduler/run')
      .expect(401);
  });

  it('will accept requests with the correct secret header, returns processing counts', () => {
    return request(app.getHttpServer())
      .post('/api/v1/scheduler/run')
      .set('x-scheduler-secret', 'e2e-tester-secret')
      .expect(201)
      .expect((rslt: Response) => {
        const responseBody = rslt.body as { data: Record<string, unknkown> };
        expect(responseBody.data).toHaveProperty('overdueTransitionedCount');
        expect(responseBody.data).toHaveProperty('missedTransitionedCount');
        expect(responseBody.data).toHaveProperty('processedCount');
      });
  });
});
