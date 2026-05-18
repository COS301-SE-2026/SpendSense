typescript
import { PrismaClient, Prisma, User, Obligation, Occurrence, Score, Reward } from '@prisma/client';
import { Logger } from 'pino';

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------
class SeederError extends Error {
  public readonly cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'SeederError';
    this.cause = cause;
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEMO_PREFIX = 'demo-';
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ---------------------------------------------------------------------------
// Seed data definitions (immutable)
// ---------------------------------------------------------------------------
const USERS_DATA: ReadonlyArray<{
  id: string;
  name: string;
  email: string;
  isDemo: true;
}> = [
  { id: `${DEMO_PREFIX}user-001`, name: 'Alice Demo', email: 'alice@demo.local', isDemo: true },
  { id: `${DEMO_PREFIX}user-002`, name: 'Bob Demo', email: 'bob@demo.local', isDemo: true },
] as const;

const OBLIGATIONS_DATA: ReadonlyArray<{
  id: string;
  title: string;
  userId: string;
  isDemo: true;
}> = [
  { id: `${DEMO_PREFIX}obl-001`, title: 'Submit report', userId: USERS_DATA[0].id, isDemo: true },
  { id: `${DEMO_PREFIX}obl-002`, title: 'Complete training', userId: USERS_DATA[1].id, isDemo: true },
  { id: `${DEMO_PREFIX}obl-003`, title: 'Review code', userId: USERS_DATA[0].id, isDemo: true },
] as const;

const OCCURRENCES_DATA: ReadonlyArray<{
  id: string;
  userId: string;
  obligationId: string;
  type: string;
  isDemo: true;
}> = [
  { id: `${DEMO_PREFIX}occ-001`, userId: USERS_DATA[0].id, obligationId: OBLIGATIONS_DATA[0].id, type: 'submission', isDemo: true },
  { id: `${DEMO_PREFIX}occ-002`, userId: USERS_DATA[1].id, obligationId: OBLIGATIONS_DATA[1].id, type: 'completion', isDemo: true },
  { id: `${DEMO_PREFIX}occ-003`, userId: USERS_DATA[0].id, obligationId: OBLIGATIONS_DATA[2].id, type: 'review', isDemo: true },
  { id: `${DEMO_PREFIX}occ-004`, userId: USERS_DATA[1].id, obligationId: OBLIGATIONS_DATA[0].id, type: 'reminder', isDemo: true },
  { id: `${DEMO_PREFIX}occ-005`, userId: USERS_DATA[0].id, obligationId: OBLIGATIONS_DATA[1].id, type: 'penalty', isDemo: true },
] as const;

// ---------------------------------------------------------------------------
// Seeder class
// ---------------------------------------------------------------------------
export class DemoScoreRewardSeeder {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  /**
   * Creates an instance of the seeder.
   * @param prisma - Initialized PrismaClient.
   * @param logger - Pino logger instance.
   */
  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Main entry point: clears existing demo data and re‑seeds all records.
   * Runs inside a transaction to guarantee atomicity.
   * @throws SeederError if any step fails.
   */
  async run(): Promise<void> {
    this.logger.info('Starting demo score/reward seeder');
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await this.clearDemoData(tx);
        const users = await this.seedUsers(tx);
        const obligations = await this.seedObligations(tx, users);
        const occurrences = await this.seedOccurrences(tx, users, obligations);
        await this.seedScoresAndRewards(tx, users, occurrences);
      });
      this.logger.info('Demo score/reward seeding completed successfully');
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          { code: error.code, meta: error.meta },
          'Prisma request error during seeding'
        );
      } else if (error instanceof SeederError) {
        this.logger.error({ cause: error.cause?.message }, `Seeder error: ${error.message}`);
      } else if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
      } else {
        this.logger.error({ error: String(error) }, 'Unexpected error during seeding');
      }
      throw new SeederError('Seed transaction failed', error instanceof Error ? error : undefined);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Clears all demo‑flagged records in correct order (reverse dependency).
   * @param tx - Prisma transaction client.
   */
  private async clearDemoData(tx: Prisma.TransactionClient): Promise<void> {
    this.logger.info('Clearing existing demo data');
    // Order: reward -> score -> occurrence -> obligation -> user
    await tx.reward.deleteMany({ where: { isDemo: true } });
    await tx.score.deleteMany({ where: { isDemo: true } });
    await tx.occurrence.deleteMany({ where: { isDemo: true } });
    await tx.obligation.deleteMany({ where: { isDemo: true } });
    await tx.user.deleteMany({ where: { isDemo: true } });
    this.logger.debug('Cleared all demo data');
  }

  /**
   * Validates user seed data emails.
   * @param data - Readonly array of objects with email field.
   * @throws ValidationError if any email is invalid.
   */
  private validateUserEmails(data: ReadonlyArray<{ email: string }>): void {
    for (const user of data) {
      if (!EMAIL_REGEX.test(user.email)) {
        throw new ValidationError(`Invalid email format: "${user.email}" for user ${(user as any).id || 'unknown'}`);
      }
    }
  }

  /**
   * Seeds demo users using upsert.
   * @param tx - Prisma transaction client.
   * @returns Array of seeded User records.
   */
  private async seedUsers(tx: Prisma.TransactionClient): Promise<User[]> {
    this.logger.info('Seeding demo users');
    this.validateUserEmails(USERS_DATA);

    const users: User[] = [];
    for (const data of USERS_DATA) {
      const user = await tx.user.upsert({
        where: { id: data.id },
        update: { name: data.name, email: data.email, isDemo: data.isDemo },
        create: { id: data.id, name: data.name, email: data.email, isDemo: data.isDemo },
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Seeds demo obligations after verifying referenced users exist.
   * @param tx - Prisma transaction client.
   * @param users - Already seeded users.
   * @returns Array of seeded Obligation records.
   * @throws ValidationError if a referenced user is missing.
   */
  private async seedObligations(tx: Prisma.TransactionClient, users: User[]): Promise<Obligation[]> {
    this.logger.info('Seeding demo obligations');
    const userIds = new Set(users.map((u) => u.id));
    for (const data of OBLIGATIONS_DATA) {
      if (!userIds.has(data.userId)) {
        throw new ValidationError(
          `Obligation "${data.id}" references unknown user "${data.userId}"`
        );
      }
    }

    const obligations: Obligation[] = [];
    for (const data of OBLIGATIONS_DATA) {
      const obligation = await tx.obligation.upsert({
        where: { id: data.id },
        update: { title: data.title, userId: data.userId, isDemo: data.isDemo },
        create: { id: data.id, title: data.title, userId: data.userId, isDemo: data.isDemo },
      });
      obligations.push(obligation);
    }
    return obligations;
  }

  /**
   * Seeds demo occurrences after verifying referenced users and obligations exist.
   * @param tx - Prisma transaction client.
   * @param users - Already seeded users.
   * @param obligations - Already seeded obligations.
   * @returns Array of seeded Occurrence records.
   * @throws ValidationError if an ID reference is invalid.
   */
  private async seedOccurrences(
    tx: Prisma.TransactionClient,
    users: User[],
    obligations: Obligation[]
  ): Promise<Occurrence[]> {
    this.logger.info('Seeding demo occurrences');
    const userIds = new Set(users.map((u) => u.id));
    const obligationIds = new Set(obligations.map((o) => o.id));

    for (const data of OCCURRENCES_DATA) {
      if (!userIds.has(data.userId)) {
        throw new ValidationError(`Occurrence "${data.id}" references unknown user "${data.userId}"`);
      }
      if (!obligationIds.has(data.obligationId)) {
        throw new ValidationError(`Occurrence "${data.id}" references unknown obligation "${data.obligationId}"`);
      }
    }

    const occurrences: Occurrence[] = [];
    for (const data of OCCURRENCES_DATA) {
      const occurrence = await tx.occurrence.upsert({
        where: { id: data.id },
        update: { userId: data.userId, obligationId: data.obligationId, type: data.type, isDemo: data.isDemo },
        create: { id: data.id, userId: data.userId, obligationId: data.obligationId, type: data.type, isDemo: data.isDemo },
      });
      occurrences.push(occurrence);
    }
    return occurrences;
  }

  /**
   * Seeds demo scores and rewards after processing occurrences.
   * Generates one score per user summing points, and a reward if score >= 10.
   * @param tx - Prisma transaction client.
   * @param users - Already seeded users.
   * @param occurrences - Already seeded occurrences.
   */
  private async seedScoresAndRewards(
    tx: Prisma.TransactionClient,
    users: User[],
    occurrences: Occurrence[]
  ): Promise<void> {
    this.logger.info('Seeding demo scores and rewards');

    // Assign points per occurrence type
    const pointMap: Record<string, number> = {
      submission: 5,
      completion: 10,
      review: 3,
      reminder: -1,
      penalty: -5,
    };

    // Calculate total points per user
    const userScores = new Map<string, number>();
    for (const user of users) {
      userScores.set(user.id, 0);
    }
    for (const occ of occurrences) {
      const points = pointMap[occ.type] ?? 0;
      const current = userScores.get(occ.userId);
      if (current !== undefined) {
        userScores.set(occ.userId, current + points);
      }
    }

    // Upsert scores and create rewards if threshold met
    for (const user of users) {
      const totalScore = userScores.get(user.id) ?? 0;

      // Score record (one per user)
      await tx.score.upsert({
        where: { userId: user.id },
        update: { value: totalScore, isDemo: true },
        create: { id: `${DEMO_PREFIX}score-${user.id}`, userId: user.id, value: totalScore, isDemo: true },
      });

      // Reward if total score >= 10
      if (totalScore >= 10) {
        const rewardId = `${DEMO_PREFIX}reward-${user.id}`;
        await tx.reward.upsert({
          where: { id: rewardId },
          update: { userId: user.id, description: 'Achievement unlocked: Active participant', isDemo: true },
          create: { id: rewardId, userId: user.id, description: 'Achievement unlocked: Active participant', isDemo: true },
        });
      }
    }
  }
}