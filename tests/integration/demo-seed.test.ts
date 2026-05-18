import { createConnection, getConnection, getRepository } from 'typeorm';
import { User } from '../../src/entity/User';
import { Obligation } from '../../src/entity/Obligation';
import { Occurrence } from '../../src/entity/Occurrence';
import { Session } from '../../src/entity/Session';
import { seedDemoData } from '../../src/seeds/demo';
import { Logger } from '../../src/lib/logger';

let connection;

beforeAll(async () => {
  const logger = new Logger('demo-seed-test');
  try {
    connection = await createConnection({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: Number(process.env.TEST_DB_PORT) || 5432,
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'test_demo',
      entities: [User, Obligation, Occurrence, Session],
      synchronize: true,
      logging: false,
    });
    logger.info('Test database connection established');
  } catch (error) {
    logger.error('Failed to connect to test database', error);
    throw error;
  }
});

afterAll(async () => {
  if (connection && connection.isConnected) {
    await connection.close();
  }
});

beforeEach(async () => {
  // Clear all demo-scoped data before each test (idempotency step)
  const repositories = [
    getRepository(Occurrence),
    getRepository(Obligation),
    getRepository(Session),
    getRepository(User),
  ];
  for (const repo of repositories) {
    await repo.delete({ scope: 'demo' });
  }
});

describe('Demo seed integration', () => {
  it('should seed demo data with correct row counts', async () => {
    // Act
    await seedDemoData();

    // Assert
    const userCount = await getRepository(User).count({ where: { scope: 'demo' } });
    const obligationCount = await getRepository(Obligation).count({ where: { scope: 'demo' } });
    const occurrenceCount = await getRepository(Occurrence).count({ where: { scope: 'demo' } });
    const sessionCount = await getRepository(Session).count({ where: { scope: 'demo' } });

    expect(userCount).toBeGreaterThan(0);
    expect(obligationCount).toBeGreaterThan(0);
    expect(occurrenceCount).toBeGreaterThan(0);
    expect(sessionCount).toBeGreaterThan(0);

    // Verify inter‑model consistency
    const user = await getRepository(User).findOne({ where: { scope: 'demo' }, relations: ['obligations'] });
    expect(user).toBeDefined();
    expect(user.obligations.length).toBeGreaterThan(0);

    const obligations = await getRepository(Obligation).find({ where: { scope: 'demo' }, relations: ['occurrences'] });
    for (const obligation of obligations) {
      expect(obligation.occurrences.length).toBeGreaterThan(0);
    }
  });

  it('should be idempotent – same state after multiple runs', async () => {
    // Seed twice
    await seedDemoData();
    const countsAfterFirstSeed = await getDemoCounts();
    await seedDemoData();
    const countsAfterSecondSeed = await getDemoCounts();

    // Row counts must be identical
    expect(countsAfterSecondSeed).toEqual(countsAfterFirstSeed);
  });
});

/**
 * Returns a snapshot of row counts for all demo‑scoped entities.
 */
async function getDemoCounts() {
  return {
    users: await getRepository(User).count({ where: { scope: 'demo' } }),
    obligations: await getRepository(Obligation).count({ where: { scope: 'demo' } }),
    occurrences: await getRepository(Occurrence).count({ where: { scope: 'demo' } }),
    sessions: await getRepository(Session).count({ where: { scope: 'demo' } }),
  };
}