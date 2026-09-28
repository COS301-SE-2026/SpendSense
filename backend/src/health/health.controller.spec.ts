import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import type { Response } from 'express';

type PrismaHealthMock = {
  $queryRaw: jest.Mock<Promise<unknown>, [TemplateStringsArray]>;
};

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaHealthMock;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let response: Pick<Response, 'status'>;
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalPackageVersion = process.env.npm_package_version;
  const originalAppVersion = process.env.APP_VERSION;
  const originalFetch = global.fetch;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn<Promise<unknown>, [TemplateStringsArray]>(),
    };
    controller = new HealthController(prisma as unknown as PrismaService);
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    response = {
      status: jest.fn().mockReturnThis(),
    };
    process.env.npm_package_version = '1.2.3-test';
    delete process.env.APP_VERSION;
  });

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
    process.env.npm_package_version = originalPackageVersion;
    if (originalAppVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = originalAppVersion;
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns healthy when the database and AI service are reachable', async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    fetchMock.mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;

    await expect(controller.health(response as Response)).resolves.toMatchObject({
      status: 'healthy',
      version: '1.2.3-test',
      services: {
        database: 'up',
        ai: 'up',
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('http://localhost:8000/health'),
      expect.objectContaining({
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('returns degraded when the database is reachable but AI is unavailable', async () => {
    process.env.AI_SERVICE_URL = undefined;
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.ready(response as Response)).resolves.toMatchObject({
      status: 'degraded',
      services: {
        database: 'up',
        ai: 'down',
      },
    });
  });

  it('returns unhealthy with a 503 status when the database check fails', async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
    prisma.$queryRaw.mockRejectedValue(new Error('connection failed'));
    fetchMock.mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;

    await expect(controller.health(response as Response)).resolves.toMatchObject({
      status: 'unhealthy',
      services: {
        database: 'down',
        ai: 'up',
      },
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('does not expose secrets or internal connection details', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service.local:8000';
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/spendsense';
    prisma.$queryRaw.mockRejectedValue(
      new Error('postgresql://user:password@localhost:5432/spendsense'),
    );
    fetchMock.mockRejectedValue(new Error('network failure'));
    global.fetch = fetchMock;

    const health = await controller.health(response as Response);
    const serializedResponse = JSON.stringify(health);

    expect(serializedResponse).not.toContain('password');
    expect(serializedResponse).not.toContain('postgresql://');
    expect(serializedResponse).not.toContain('ai-service.local');
    expect(health).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String) as string,
      version: '1.2.3-test',
      services: {
        database: 'down',
        ai: 'down',
      },
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('keeps liveness independent of database and AI availability', () => {
    process.env.APP_VERSION = 'candidate-sha';

    expect(controller.live()).toEqual({
      status: 'alive',
      timestamp: expect.any(String) as string,
      version: 'candidate-sha',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
