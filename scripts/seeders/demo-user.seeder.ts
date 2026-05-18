typescript
import { PrismaClient, User, Prisma } from '@prisma/client';
import logger from '../../lib/logger';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const DEMO_SEED_TIMESTAMP = new Date('2026-01-01T00:00:00Z');
const DEMO_OCCURRENCE_DUE = new Date('2026-12-31T23:59:59Z');
const DEMO_SCORE_POINTS = 150;
const DEMO_EMAIL_DOMAIN = 'demo.aigon.dev';
const EXTERNAL_ID_PREFIX = 'demo-';

interface DemoUserSeed {
  readonly externalId: string;
  readonly email: string;
  readonly role: 'admin' | 'regular';
}

const DEMO_USERS: readonly DemoUserSeed[] = [
  { externalId: 'demo-admin-001', email: `admin@${DEMO_EMAIL_DOMAIN}`, role: 'admin' },
  { externalId: 'demo-user-001', email: `user1@${DEMO_EMAIL_DOMAIN}`, role: 'regular' },
  { externalId: 'demo-user-002', email: `user2@${DEMO_EMAIL_DOMAIN}`, role: 'regular' },
] as const;

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

class SeedValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedValidationError';
  }
}

class SeedDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedDataError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCorrelationId(): string {
  return randomUUID();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateSeedInput(): void {
  if (DEMO_USERS.length === 0) {
    throw new SeedValidationError('Seed configuration error: DEMO_USERS is empty.');
  }

  const emails = new Set<string>();
  const extIds = new Set<string>();

  for (const [index, user] of DEMO_USERS.entries()) {
    if (!user.externalId) {
      throw new SeedValidationError(`Missing externalId for user at index ${index}`);
    }
    if (!user.email) {
      throw new SeedValidationError(`Missing email for user at index ${index}`);
    }
    if (!EMAIL_REGEX.test(user.email)) {
      throw new SeedValidationError(`Invalid email format for user: ${user.email}`);
    }
    if (!['admin', 'regular'].includes(user.role)) {
      throw new SeedValidationError(`Invalid role "${user.role}" for user: ${user.email}`);
    }
    if (emails.has(user.email)) {
      throw new SeedValidationError(`Duplicate email: ${user.email}`);
    }
    if (extIds.has(user.externalId)) {
      throw new SeedValidationError(`Duplicate externalId: ${user.externalId}`);
    }
    emails.add(user.email);
    extIds.add(user.externalId);
  }
}

// ---------------------------------------------------------------------------
// Data Deletion (Idempotent)
// ---------------------------------------------------------------------------

async function clearDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const result = await transaction.user.findFirst({ where: { isDemo: true } });
  if (!result) {
    logger.debug('No existing demo data to clear.');
    return;
  }

  await transaction.reward.deleteMany({ where: { user: { isDemo: true } } });
  await transaction.score.deleteMany({ where: { user: { isDemo: true } } });
  await transaction.occurrence.deleteMany({ where: { obligation: { user: { isDemo: true } } } });
  await transaction.obligation.deleteMany({ where: { user: { isDemo: true } } });
  await transaction.user.deleteMany({ where: { isDemo: true } });
  logger.debug('Cleared all existing demo data.');
}

// ---------------------------------------------------------------------------
// Data Creation
// ---------------------------------------------------------------------------

async function seedUsers(
  transaction: Prisma.TransactionClient,
): Promise<User[]> {
  const userCreateData: Prisma.UserCreateManyInput[] = DEMO_USERS.map((u) => ({
    externalId: u.externalId,
    email: u.email,
    role: u.role,
    isDemo: true,
  }));

  await transaction.user.createMany({
    data: userCreateData,
    skipDuplicates: false,
  });
  logger.debug('Bulk created demo users.');

  // Retrieve created users because createMany does not return created records
  const users = await transaction.user.findMany({
    where: {
      isDemo: true,
      externalId: { in: DEMO_USERS.map((u) => u.externalId) },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length !== DEMO_USERS.length) {
    throw new SeedDataError(
      `Mismatch in number of created demo users. Expected ${DEMO_USERS.length}, got ${users.length}`,
    );
  }
  return users;
}

async function seedObligations(
  transaction: Prisma.TransactionClient,
  users: User[],
): Promise<void> {
  const obligations: Prisma.ObligationCreateManyInput[] = users.map((user) => ({
    externalId: `${EXTERNAL_ID_PREFIX}obl-${user.externalId}`,
    title: `Demo Obligation for ${user.email}`,
    description: 'This is a demo obligation for testing purposes.',
    userId: user.id,
    isDemo: true,
  }));

  await transaction.obligation.createMany({
    data: obligations,
    skipDuplicates: false,
  });
  logger.debug('Bulk created demo obligations.');
}

async function seedOccurrences(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  const obligations = await transaction.obligation.findMany({
    where: { isDemo: true },
    select: { id: true, externalId: true },
  });

  if (obligations.length === 0) {
    logger.warn('No demo obligations found; skipping occurrence seeding.');
    return;
  }

  const occurrences: Prisma.OccurrenceCreateManyInput[] = obligations.map((obl) => ({
    externalId: `${EXTERNAL_ID_PREFIX}occ-${obl.externalId}`,
    obligationId: obl.id,
    status: 'PENDING',
    dueDate: DEMO_OCCURRENCE_DUE,
    isDemo: true,
  }));

  await transaction.occurrence.createMany({
    data: occurrences,
    skipDuplicates: false,
  });
  logger.debug('Bulk created demo occurrences.');
}

async function seedScoresAndRewards(
  transaction: Prisma.TransactionClient,
  users: User[],
): Promise<void> {
  const scores: Prisma.ScoreCreateManyInput[] = users.map((user) => ({
    userId: user.id,
    points: DEMO_SCORE_POINTS,
    reason: 'Demo seed score',
    isDemo: true,
    createdAt: DEMO_SEED_TIMESTAMP,
  }));

  const rewards: Prisma.RewardCreateManyInput[] = users.map((user) => ({
    userId: user.id,
    type: 'BADGE',
    name: 'Demo Star',
    isDemo: true,
    createdAt: DEMO_SEED_TIMESTAMP,
  }));

  await transaction.score.createMany({ data: scores, skipDuplicates: false });
  await transaction.reward.createMany({ data: rewards, skipDuplicates: false });
  logger.debug('Bulk created demo scores and rewards.');
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Seeds demo users, their obligations, occurrences, and score/reward data.
 *
 * **Idempotent** – clears all existing demo data (deterministic by `isDemo` flag)
 * before creating fresh records. Runs inside a **single Prisma transaction** to
 * ensure atomicity: on failure, all changes are rolled back.
 *
 * @param correlationId - Optional correlation ID for logging; generated if omitted.
 * @throws {SeedValidationError} If seed configuration fails validation.
 * @throws {SeedDataError} If data integrity checks fail during creation.
 * @throws {Prisma.PrismaClientKnownRequestError} On database constraint violations.
 * @throws {Prisma.PrismaClientValidationError} On invalid Prisma input.
 */
export async function seedDemoData(correlationId?: string): Promise<void> {
  const cid = correlationId ?? generateCorrelationId();
  const startTime = Date.now();

  validateSeedInput();

  const prisma = new PrismaClient({
    log: ['warn', 'error'],
  });

  try {
    logger.info({ correlationId: cid }, 'Starting demo data seed...');

    await prisma.$transaction(async (tx) => {
      await clearDemoData(tx);

      const users = await seedUsers(tx);

      // Run independent seed tasks concurrently
      await Promise.all([
        seedObligations(tx, users).then(() => seedOccurrences(tx)),
        seedScoresAndRewards(tx, users),
      ]);
    });

    const elapsed = Date.now() - startTime;
    logger.info({ correlationId: cid, durationMs: elapsed }, 'Demo data seed completed successfully.');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error(
        { correlationId: cid, prismaCode: error.code, meta: error.meta },
        'Prisma known request error during seed.',
      );
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error(
        { correlationId: cid },
        'Prisma validation error during seed: %s',
        error.message,
      );
    } else if (error instanceof SeedValidationError || error instanceof SeedDataError) {
      logger.error({ correlationId: cid }, 'Seed logic error: %s', error.message);
    } else if (error instanceof Error) {
      logger.error({ correlationId: cid }, 'Seed failed: %s', error.message);
    } else {
      logger.error({ correlationId: cid }, 'Seed failed with unknown error.', error);
    }
    throw error;
  } finally {
    await prisma.$disconnect().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ correlationId: cid }, 'Failed to disconnect Prisma client: %s', msg);
    });
  }
}

// ---------------------------------------------------------------------------
// CLI Entry (supports both CommonJS and ESM)
// ---------------------------------------------------------------------------

/* c8 ignore next 4 */
if (
  (typeof require !== 'undefined' && require.main === module) ||
  (typeof process !== 'undefined' && process.argv[1] === import.meta.url)
) {
  seedDemoData()
    .then(() => {
      logger.info('Demo seed script finished. Exiting.');
      process.exit(0);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Demo seed script failed: %s', message);
      process.exit(1);
    });
}