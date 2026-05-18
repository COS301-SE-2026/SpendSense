typescript
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import pino, { Logger } from 'pino';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { User } from '../../models/User';
import { Obligation } from '../../models/Obligation';
import { Occurrence } from '../../models/Occurrence';
import { UserScore } from '../../models/UserScore';
import { Reward } from '../../models/Reward';
import config from '../../config/database';

// --------------------------------------------------------------------------
// Configuration & Constants
// --------------------------------------------------------------------------

/** Structure for demo seeding configuration */
export interface DemoSeedConfig {
  databaseUrl: string;
  batchSize: number;
  enableLogging: boolean;
}

const DEFAULT_CONFIG: DemoSeedConfig = {
  databaseUrl: process.env.DATABASE_URL || '',
  batchSize: 50,
  enableLogging: true,
};

// Predefined deterministic UUIDs for demo entities
const DEMO_USER_IDS: readonly string[] = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
] as const;

const DEMO_OBLIGATION_IDS: readonly string[] = [
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
] as const;

const DEMO_OCCURRENCE_IDS: readonly string[] = [
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022',
] as const;

const DEMO_SCORE_IDS: readonly string[] = [
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000032',
] as const;

const DEMO_REWARD_IDS: readonly string[] = [
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000042',
] as const;

// --------------------------------------------------------------------------
// Custom Error Classes
// --------------------------------------------------------------------------

/**
 * Custom error thrown during demo seeding operations.
 */
export class SeedError extends Error {
  public readonly entityType?: string;
  public readonly entityIds?: readonly string[];

  constructor(
    message: string,
    options?: { entityType?: string; entityIds?: readonly string[]; cause?: Error }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SeedError';
    this.entityType = options?.entityType;
    this.entityIds = options?.entityIds;
  }
}

/**
 * Error thrown when configuration validation fails.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// --------------------------------------------------------------------------
// Logger Initialization
// --------------------------------------------------------------------------

/**
 * Creates a child logger pre‑configured for the demo seeder module.
 * @param config - Seed configuration (used to enable/disable logging)
 * @returns A pino Logger instance.
 */
function createDemoLogger(config: DemoSeedConfig): Logger {
  const baseLogger = pino({
    name: 'demo-obligation-seeder',
    level: config.enableLogging ? 'info' : 'silent',
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  });
  return baseLogger.child({ module: 'demo-seeder' });
}

// --------------------------------------------------------------------------
// Validation Helpers
// --------------------------------------------------------------------------

/**
 * Validates that a given string is a well‑formed UUID.
 * @param id - The string to validate.
 * @returns `true` if the string is a valid UUID, `false` otherwise.
 */
function isValidUuid(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Validates all predefined demo IDs are syntactically correct UUIDs.
 * Throws a {@link ConfigurationError} if any ID is invalid.
 */
function validateDemoIds(): void {
  const allIds = [
    ...DEMO_USER_IDS,
    ...DEMO_OBLIGATION_IDS,
    ...DEMO_OCCURRENCE_IDS,
    ...DEMO_SCORE_IDS,
    ...DEMO_REWARD_IDS,
  ];
  for (const id of allIds) {
    if (!isValidUuid(id)) {
      throw new ConfigurationError(`Invalid demo UUID detected: ${id}`);
    }
  }
}

/**
 * Validates the database configuration.
 * @param config - The seed configuration to validate.
 * @throws {ConfigurationError} if required fields are missing or invalid.
 */
function validateConfig(config: DemoSeedConfig): void {
  if (!config.databaseUrl || config.databaseUrl.trim() === '') {
    throw new ConfigurationError('DATABASE_URL environment variable is required.');
  }
  if (config.batchSize < 1) {
    throw new ConfigurationError('batchSize must be at least 1.');
  }
}

/**
 * Simple email format validation (RFC 5322 simplified).
 * @param email - The email string to validate.
 * @returns `true` if the email format appears valid.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// --------------------------------------------------------------------------
// Core Seeder Class
// --------------------------------------------------------------------------

/**
 * Manages the creation, deletion, and verification of demo seed data.
 *
 * All seeding operations are performed within a single database transaction to
 * guarantee atomicity and consistency. The seeder logs every step and provides
 * detailed error information on failure.
 *
 * The seeded data uses deterministic UUIDs to allow reliable reproduction across environments.
 */
export class DemoSeeder {
  private readonly dataSource: DataSource;
  private readonly logger: Logger;
  private readonly batchSize: number;

  /**
   * @param dataSource - An initialised TypeORM DataSource instance.
   * @param config - Optional seed configuration (defaults are used if omitted).
   * @throws {ConfigurationError} if the configuration is invalid.
   */
  constructor(dataSource: DataSource, config: Partial<DemoSeedConfig> = {}) {
    const fullConfig: DemoSeedConfig = { ...DEFAULT_CONFIG, ...config };
    validateConfig(fullConfig);

    this.dataSource = dataSource;
    this.logger = createDemoLogger(fullConfig);
    this.batchSize = fullConfig.batchSize;
  }

  // ------------------------------------------------------------------------
  // Public Entry Point
  // ------------------------------------------------------------------------

  /**
   * Seeds all demo data: users, obligations, occurrences, scores, and rewards.
   *
   * The operation is wrapped in a transaction. If any step fails, the entire
   * transaction is rolled back to leave the database in a clean state.
   *
   * @throws {SeedError} if seeding fails for any reason.
   * @returns A promise that resolves when seeding is complete.
   */
  public async seed(): Promise<void> {
    validateDemoIds();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      this.logger.info({ step: 'clear' }, 'Clearing existing demo data...');
      await this.clearDemoData(queryRunner);

      this.logger.info({ step: 'users' }, 'Seeding demo users...');
      const userCount = await this.seedUsers(queryRunner);
      this.logger.info({ step: 'users', count: userCount }, 'Users seeded.');

      this.logger.info({ step: 'obligations' }, 'Seeding demo obligations...');
      const obligationCount = await this.seedObligations(queryRunner);
      this.logger.info({ step: 'obligations', count: obligationCount }, 'Obligations seeded.');

      this.logger.info({ step: 'occurrences' }, 'Seeding demo occurrences...');
      const occurrenceCount = await this.seedOccurrences(queryRunner);
      this.logger.info({ step: 'occurrences', count: occurrenceCount }, 'Occurrences seeded.');

      this.logger.info({ step: 'scores' }, 'Seeding demo scores...');
      const scoreCount = await this.seedScores(queryRunner);
      this.logger.info({ step: 'scores', count: scoreCount }, 'Scores seeded.');

      this.logger.info({ step: 'rewards' }, 'Seeding demo rewards...');
      const rewardCount = await this.seedRewards(queryRunner);
      this.logger.info({ step: 'rewards', count: rewardCount }, 'Rewards seeded.');

      await queryRunner.commitTransaction();
      this.logger.info(
        { total: { users: userCount, obligations: obligationCount, occurrences: occurrenceCount, scores: scoreCount, rewards: rewardCount } },
        'Demo seeding completed successfully.'
      );
    } catch (error) {
      this.logger.error({ err: error }, 'Demo seeding transaction rolled back.');
      await queryRunner.rollbackTransaction();
      throw new SeedError('Demo seeding failed. Database state unchanged.', { cause: error as Error });
    } finally {
      await queryRunner.release();
    }
  }

  // ------------------------------------------------------------------------
  // Data Removal
  // ------------------------------------------------------------------------

  /**
   * Removes all demo data in reverse dependency order (rewards, scores, occurrences, obligations, users).
   * Only deletes records whose IDs are in the predefined demo ID sets to avoid affecting real data.
   *
   * @param queryRunner - The active query runner with a started transaction.
   */
  private async clearDemoData(queryRunner: QueryRunner): Promise<void> {
    const manager = queryRunner.manager;

    await manager.delete(Reward, { id: In(DEMO_REWARD_IDS) });
    await manager.delete(UserScore, { id: In(DEMO_SCORE_IDS) });
    await manager.delete(Occurrence, { id: In(DEMO_OCCURRENCE_IDS) });
    await manager.delete(Obligation, { id: In(DEMO_OBLIGATION_IDS) });
    await manager.delete(User, { id: In(DEMO_USER_IDS) });

    this.logger.debug(
      { deletedRewards: DEMO_REWARD_IDS.length, deletedScores: DEMO_SCORE_IDS.length, deletedOccurrences: DEMO_OCCURRENCE_IDS.length, deletedObligations: DEMO_OBLIGATION_IDS.length, deletedUsers: DEMO_USER_IDS.length },
      'Existing demo data cleared.'
    );
  }

  // ------------------------------------------------------------------------
  // Seeding Methods
  // ------------------------------------------------------------------------

  /**
   * Seeds demo users with deterministic IDs and predefined profiles.
   * @param queryRunner - The active query runner.
   * @returns The number of users inserted.
   */
  private async seedUsers(queryRunner: QueryRunner): Promise<number> {
    const manager = queryRunner.manager;
    const users: Partial<User>[] = [
      {
        id: DEMO_USER_IDS[0],
        email: 'alice@example.com',
        username: 'alice_demo',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-06-01T00:00:00Z'),
      },
      {
        id: DEMO_USER_IDS[1],
        email: 'bob@example.com',
        username: 'bob_demo',
        createdAt: new Date('2023-02-01T00:00:00Z'),
        updatedAt: new Date('2023-07-01T00:00:00Z'),
      },
      {
        id: DEMO_USER_IDS[2],
        email: 'charlie@example.com',
        username: 'charlie_demo',
        createdAt: new Date('2023-03-01T00:00:00Z'),
        updatedAt: new Date('2023-08-01T00:00:00Z'),
      },
    ];

    // Validate emails before insertion
    for (const user of users) {
      if (!isValidEmail(user.email!)) {
        throw new SeedError(`Invalid email format for user: ${user.email}`, { entityType: 'User', entityIds: [user.id!] });
      }
    }

    // Use insert with array for batch insertion (TypeORM will handle batching based on driver limits)
    const result = await manager.insert(User, users);
    return result.identifiers.length;
  }

  /**
   * Seeds demo obligations linked to demo users.
   * @param queryRunner - The active query runner.
   * @returns The number of obligations inserted.
   */
  private async seedObligations(queryRunner: QueryRunner): Promise<number> {
    const manager = queryRunner.manager;
    const obligations: Partial<Obligation>[] = [
      {
        id: DEMO_OBLIGATION_IDS[0],
        userId: DEMO_USER_IDS[0],
        title: 'Complete project report',
        description: 'Finalize and submit the quarterly project report.',
        status: 'pending',
        dueDate: new Date('2024-01-15T00:00:00Z'),
        createdAt: new Date('2023-12-01T00:00:00Z'),
        updatedAt: new Date('2023-12-01T00:00:00Z'),
      },
      {
        id: DEMO_OBLIGATION_IDS[1],
        userId: DEMO_USER_IDS[1],
        title: 'Prepare presentation',
        description: 'Create slides for the team meeting on Friday.',
        status: 'in_progress',
        dueDate: new Date('2024-01-20T00:00:00Z'),
        createdAt: new Date('2023-12-05T00:00:00Z'),
        updatedAt: new Date('2023-12-10T00:00:00Z'),
      },
      {
        id: DEMO_OBLIGATION_IDS[2],
        userId: DEMO_USER_IDS[2],
        title: 'Update dependencies',
        description: 'Upgrade all npm packages to latest versions.',
        status: 'completed',
        dueDate: new Date('2024-01-10T00:00:00Z'),
        createdAt: new Date('2023-11-20T00:00:00Z'),
        updatedAt: new Date('2024-01-05T00:00:00Z'),
      },
    ];

    // Validate that each user exists (already seeded)
    // We can trust they exist within the same transaction
    const result = await manager.insert(Obligation, obligations);
    return result.identifiers.length;
  }

  /**
   * Seeds demo occurrences linked to obligations.
   * @param queryRunner - The active query runner.
   * @returns The number of occurrences inserted.
   */
  private async seedOccurrences(queryRunner: QueryRunner): Promise<number> {
    const manager = queryRunner.manager;
    const occurrences: Partial<Occurrence>[] = [
      {
        id: DEMO_OCCURRENCE_IDS[0],
        obligationId: DEMO_OBLIGATION_IDS[0],
        type: 'reminder',
        occurredAt: new Date('2024-01-10T09:00:00Z'),
        data: { channel: 'email', message: 'Reminder: project report due in 5 days.' },
      },
      {
        id: DEMO_OCCURRENCE_IDS[1],
        obligationId: DEMO_OBLIGATION_IDS[1],
        type: 'check_in',
        occurredAt: new Date('2024-01-18T14:30:00Z'),
        data: { channel: 'slack', message: 'Check-in: progress on presentation?' },
      },
      {
        id: DEMO_OCCURRENCE_IDS[2],
        obligationId: DEMO_OBLIGATION_IDS[2],
        type: 'completion',
        occurredAt: new Date('2024-01-05T16:00:00Z'),
        data: { channel: 'system', message: 'Obligation marked as completed.' },
      },
    ];

    const result = await manager.insert(Occurrence, occurrences);
    return result.identifiers.length;
  }

  /**
   * Seeds demo user scores linked to users.
   * @param queryRunner - The active query runner.
   * @returns The number of scores inserted.
   */
  private async seedScores(queryRunner: QueryRunner): Promise<number> {
    const manager = queryRunner.manager;
    const scores: Partial<UserScore>[] = [
      {
        id: DEMO_SCORE_IDS[0],
        userId: DEMO_USER_IDS[0],
        totalPoints: 150,
        level: 'bronze',
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: DEMO_SCORE_IDS[1],
        userId: DEMO_USER_IDS[1],
        totalPoints: 320,
        level: 'silver',
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: DEMO_SCORE_IDS[2],
        userId: DEMO_USER_IDS[2],
        totalPoints: 580,
        level: 'gold',
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const result = await manager.insert(UserScore, scores);
    return result.identifiers.length;
  }

  /**
   * Seeds demo rewards linked to users.
   * @param queryRunner - The active query runner.
   * @returns The number of rewards inserted.
   */
  private async seedRewards(queryRunner: QueryRunner): Promise<number> {
    const manager = queryRunner.manager;
    const rewards: Partial<Reward>[] = [
      {
        id: DEMO_REWARD_IDS[0],
        userId: DEMO_USER_IDS[0],
        name: 'First Milestone',
        description: 'Completed first obligation.',
        pointsAwarded: 50,
        awardedAt: new Date('2024-01-05T10:00:00Z'),
      },
      {
        id: DEMO_REWARD_IDS[1],
        userId: DEMO_USER_IDS[1],
        name: 'Consistency Badge',
        description: 'Maintained streak for 7 days.',
        pointsAwarded: 100,
        awardedAt: new Date('2024-01-10T12:00:00Z'),
      },
      {
        id: DEMO_REWARD_IDS[2],
        userId: DEMO_USER_IDS[2],
        name: 'Top Performer',
        description: 'Achieved highest score in the quarter.',
        pointsAwarded: 200,
        awardedAt: new Date('2024-01-15T15:00:00Z'),
      },
    ];

    const result = await manager.insert(Reward, rewards);
    return result.identifiers.length;
  }
}

// --------------------------------------------------------------------------
// TypeORM utility for `in` operator (used in `clearDemoData`)
// --------------------------------------------------------------------------

import { In } from 'typeorm';