import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalPackageVersion = process.env.npm_package_version;
  const originalFetch = global.fetch;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    };
    controller = new HealthController(prisma as unknown as PrismaService);
    process.env.npm_package_version = '1.2.3-test';
  });

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
    process.env.npm_package_version = originalPackageVersion;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns healthy when the database and AI service are reachable', async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await expect(controller.health()).resolves.toMatchObject({
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
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns degraded when the database is reachable but AI is unavailable', async () => {
    process.env.AI_SERVICE_URL = undefined;
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    await expect(controller.health()).resolves.toMatchObject({
      status: 'degraded',
      services: {
        database: 'up',
        ai: 'down',
      },
    });
  });

  it('returns unhealthy when the database check fails', async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
    prisma.$queryRaw.mockRejectedValue(new Error('connection failed'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await expect(controller.health()).resolves.toMatchObject({
      status: 'unhealthy',
      services: {
        database: 'down',
        ai: 'up',
      },
    });
  });

  it('does not expose secrets or internal connection details', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service.local:8000';
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/spendsense';
    prisma.$queryRaw.mockRejectedValue(
      new Error('postgresql://user:password@localhost:5432/spendsense'),
    );
    global.fetch = jest.fn().mockRejectedValue(new Error('network failure'));

    const response = await controller.health();
    const serializedResponse = JSON.stringify(response);

    expect(serializedResponse).not.toContain('password');
    expect(serializedResponse).not.toContain('postgresql://');
    expect(serializedResponse).not.toContain('ai-service.local');
    expect(response).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String),
      version: '1.2.3-test',
      services: {
        database: 'down',
        ai: 'down',
      },
    });
  });
});
