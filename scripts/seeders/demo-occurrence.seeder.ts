typescript
import { v5 as uuidv5, validate as isUuid } from 'uuid';
import {
  EntityManager,
  QueryRunner,
  QueryFailedError,
  Repository,
  createConnection,
} from 'typeorm';
import { User } from '../../src/entities/User';
import { Obligation } from '../../src/entities/Obligation';
import { Occurrence } from '../../src/entities/Occurrence';
import { Score } from '../../src/entities/Score';
import { Reward } from '../../src/entities/Reward';

// ────────────────────────────────────────────────────────────
// Types & Interfaces
// ────────────────────────────────────────────────────────────

/** Supported log levels */
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Structured log entry shape */
interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly module: string;
  readonly message: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Result returned by seedDemo function */
interface SeedDemoResult {
  readonly users: User[];
  readonly obligations: Obligation[];
  readonly occurrences: Occurrence[];
  readonly scores: Score[];
  readonly rewards: Reward[];
}

/** Options for creating deterministic UUIDs */
interface DeterministicUuidOptions {
  readonly namespace?: string;
}

// ────────────────────────────────────────────────────────────
// Constants & Configuration (environment-aware with fallbacks)
// ────────────────────────────────────────────────────────────

const DEFAULT_NAMESPACE = '00000000-0000-0000-0000-000000000000';
const DEMO_NAMESPACE: string = process.env.DEMO_UUID_NAMESPACE || DEFAULT_NAMESPACE;
const DEMO_ROLE: string = process.env.DEMO_ROLE || 'demo';
const DEMO_USERS: readonly string[] = process.env.DEMO_USERS
  ? process.env.DEMO_USERS.split(',').map((s) => s.trim())
  : ['alice', 'bob', 'charlie'];

const OBLIGATIONS_PER_USER: number = (() => {
  const val = parseInt(process.env.DEMO_OBLIGATIONS_PER_USER ?? '3', 10);
  return Number.isFinite(val) && val > 0 ? val : 3;
})();

const MAX_POINTS_SCORE: number = (() => {
  const val = parseFloat(process.env.DEMO_MAX_POINTS_SCORE ?? '100');
  return Number.isFinite(val) && val >= 0 ? val : 100;
})();

const MAX_POINTS_REWARD: number = (() => {
  const val = parseFloat(process.env.DEMO_MAX_POINTS_REWARD ?? '50');
  return Number.isFinite(val) && val >= 0 ? val : 50;
})();

const DEFAULT_OCCURRENCE_DATE: string =
  process.env.DEMO_OCCURRENCE_DATE || '2025-01-15T10:00:00Z';

const SCORE_ENTRIES_PER_USER: number = (() => {
  const val = parseInt(process.env.DEMO_SCORE_ENTRIES_PER_USER ?? '3', 10);
  return Number.isFinite(val) && val > 0 ? val : 3;
})();

const REWARDS_PER_USER: number = (() => {
  const val = parseInt(process.env.DEMO_REWARDS_PER_USER ?? '2', 10);
  return Number.isFinite(val) && val > 0 ? val : 2;
})();

// ────────────────────────────────────────────────────────────
// Logger (structured JSON, configurable level)
// ────────────────────────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (() => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  return 'debug';
})();

/**
 * Structured logger with monotonic level filtering.
 * @param level - Severity of the log entry.
 * @param message - Human‑readable description.
 * @param meta - Optional structured metadata.
 */
function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module: 'demo-seeder',
    message,
    meta: meta ? { ...meta } : undefined,
  };
  const formatted = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

// ────────────────────────────────────────────────────────────
// Helper: Deterministic UUID (v5)
// ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic UUID v5 using the configured namespace.
 * @param seed - Unique input string (must be non‑empty).
 * @param options - Optional namespace override.
 * @returns Deterministic UUID string.
 * @throws {Error} If seed is invalid.
 */
function deterministicUuid(seed: string, options?: DeterministicUuidOptions): string {
  if (!seed || typeof seed !== 'string') {
    throw new Error(
      `Invalid seed for deterministic UUID: expected non‑empty string, got ${typeof seed}`,
    );
  }
  const namespace = options?.namespace || DEMO_NAMESPACE;
  return uuidv5(seed, namespace);
}

// ────────────────────────────────────────────────────────────
// Helper: Validation utilities
// ────────────────────────────────────────────────────────────

/**
 * Assert that a value is a valid UUID string.
 * @param value - Value to check.
 * @param label - Descriptive label for error messages.
 * @throws {Error} If value is not a valid UUID.
 */
function assertValidUuid(value: string, label: string): void {
  if (!isUuid(value)) {
    // The library's validate returns boolean; we add our own type guard
    throw new Error(`${label} is not a valid UUID: ${value}`);
  }
}

/**
 * Assert that an array is non‑empty.
 * @param arr - Array to check.
 * @param label - Descriptive label.
 * @throws {Error} If array is null, undefined, or empty.
 */
function assertNonEmptyArray<T>(arr: T[] | null | undefined, label: string): asserts arr is T[] {
  if (!arr || arr.length === 0) {
    throw new Error(`${label} must be a non‑empty array.`);
  }
}

// ────────────────────────────────────────────────────────────
// Seeder helper: delete related entities in dependency order
// ────────────────────────────────────────────────────────────

/**
 * Delete all entities that belong to the demo role.
 * Uses the manager to delete in correct FK order.
 * @param manager - Active EntityManager.
 * @returns Promise resolving when deletion completes.
 * @throws {QueryFailedError} If any deletion fails.
 */
async function clearDemoData(manager: EntityManager): Promise<void> {
  log('info', 'Clearing existing demo data...');
  try {
    // Delete in order: rewards → scores → occurrences → obligations → users
    // (reverse of creation order)
    await manager.delete(Reward, { user: { role: DEMO_ROLE } });
    await manager.delete(Score, { user: { role: DEMO_ROLE } });
    await manager.delete(Occurrence, { obligation: { user: { role: DEMO_ROLE } } });
    await manager.delete(Obligation, { user: { role: DEMO_ROLE } });
    await manager.delete(User, { role: DEMO_ROLE });
    log('info', 'Demo data cleared successfully.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to clear demo data', { error: message });
    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// Seeder functions (each operates on a transactional EntityManager)
// ────────────────────────────────────────────────────────────

/**
 * Seed demo users with deterministic UUIDs.
 * @param manager - Active EntityManager.
 * @returns Array of created User entities.
 * @throws {Error} If validation fails or database insert fails.
 */
async function seedDemoUsers(manager: EntityManager): Promise<User[]> {
  log('info', 'Seeding demo users...');
  try {
    if (DEMO_USERS.length === 0) {
      throw new Error('DEMO_USERS array is empty; cannot seed users.');
    }

    const users: User[] = DEMO_USERS.map((name) => {
      const id = deterministicUuid(`demo-user-${name}`);
      assertValidUuid(id, `User ID for '${name}'`);

      const user = new User();
      user.id = id;
      user.username = `${DEMO_ROLE}-${name}`;
      user.email = `${DEMO_ROLE}-${name}@example.com`;
      user.role = DEMO_ROLE;
      return user;
    });

    const savedUserCount = await manager.count(User, { where: { role: DEMO_ROLE } });
    if (savedUserCount > 0) {
      log('warn', 'Demo users already exist; they will be overwritten.', {
        existingCount: savedUserCount,
      });
    }

    const saved = await manager.save(User, users);
    log('info', `Seeded ${saved.length} demo users.`, {
      userIds: saved.map((u) => u.id),
    });
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to seed demo users', { error: message });
    throw err;
  }
}

/**
 * Seed demo obligations for each user.
 * @param manager - Active EntityManager.
 * @param users - Array of User entities.
 * @returns Array of created Obligation entities.
 * @throws {Error} If users array is empty.
 * @throws {QueryFailedError} If insert fails.
 */
async function seedDemoObligations(
  manager: EntityManager,
  users: User[],
): Promise<Obligation[]> {
  log('info', 'Seeding demo obligations...');
  try {
    assertNonEmptyArray(users, 'Users array');

    const obligations: Obligation[] = [];

    for (const user of users) {
      for (let i = 0; i < OBLIGATIONS_PER_USER; i++) {
        const id = deterministicUuid(`demo-obligation-${user.id}-${i}`);
        assertValidUuid(id, `Obligation ID for user ${user.id}, index ${i}`);

        const obligation = new Obligation();
        obligation.id = id;
        obligation.userId = user.id;
        obligation.title = `Demo Obligation ${i + 1} (${user.username})`;
        obligation.description = `Description for demo obligation ${i + 1} for user ${user.username}`;
        // Last obligation marked as completed to enable occurrence seeding
        obligation.status = i === OBLIGATIONS_PER_USER - 1 ? 'completed' : 'active';
        obligations.push(obligation);
      }
    }

    const saved = await manager.save(Obligation, obligations);
    log('info', `Seeded ${saved.length} demo obligations.`, {
      count: saved.length,
    });
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to seed demo obligations', { error: message });
    throw err;
  }
}

/**
 * Seed demo occurrences for completed obligations.
 * @param manager - Active EntityManager.
 * @param obligations - Array of Obligation entities.
 * @returns Array of created Occurrence entities (may be empty if no completed obligations).
 * @throws {Error} If obligations array is empty.
 * @throws {QueryFailedError} If insert fails.
 */
async function seedDemoOccurrences(
  manager: EntityManager,
  obligations: Obligation[],
): Promise<Occurrence[]> {
  log('info', 'Seeding demo occurrences...');
  try {
    assertNonEmptyArray(obligations, 'Obligations array');

    const completedObligations = obligations.filter((o) => o.status === 'completed');
    if (completedObligations.length === 0) {
      log('warn', 'No completed obligations found; skipping occurrence seeding.');
      return [];
    }

    const occurrences: Occurrence[] = completedObligations.map((ob, index) => {
      const id = deterministicUuid(`demo-occurrence-${ob.id}`);
      assertValidUuid(id, `Occurrence ID for obligation ${ob.id}`);

      const occurrence = new Occurrence();
      occurrence.id = id;
      occurrence.obligationId = ob.id;
      occurrence.date = new Date(DEFAULT_OCCURRENCE_DATE);
      occurrence.outcome = 'completed';
      occurrence.meta = { demo: true, obligationIndex: index };
      return occurrence;
    });

    const saved = await manager.save(Occurrence, occurrences);
    log('info', `Seeded ${saved.length} demo occurrences.`, {
      count: saved.length,
    });
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to seed demo occurrences', { error: message });
    throw err;
  }
}

/**
 * Seed demo scores for each user.
 * @param manager - Active EntityManager.
 * @param users - Array of User entities.
 * @returns Array of created Score entities.
 * @throws {Error} If users array is empty.
 * @throws {QueryFailedError} If insert fails.
 */
async function seedDemoScores(
  manager: EntityManager,
  users: User[],
): Promise<Score[]> {
  log('info', 'Seeding demo scores...');
  try {
    assertNonEmptyArray(users, 'Users array');

    const scores: Score[] = [];

    for (const user of users) {
      for (let i = 0; i < SCORE_ENTRIES_PER_USER; i++) {
        const id = deterministicUuid(`demo-score-${user.id}-${i}`);
        assertValidUuid(id, `Score ID for user ${user.id}, index ${i}`);

        // Generate a realistic-looking score that varies across entries
        const points = Math.round(
          (Math.random() * (MAX_POINTS_SCORE - 10) + 10) * 100,
        ) / 100;

        const score = new Score();
        score.id = id;
        score.userId = user.id;
        score.points = points;
        score.reason = `Demo score entry ${i + 1} for ${user.username}`;
        score.createdAt = new Date(
          new Date(DEFAULT_OCCURRENCE_DATE).getTime() - i * 86400000, // each day before
        );
        scores.push(score);
      }
    }

    const saved = await manager.save(Score, scores);
    log('info', `Seeded ${saved.length} demo scores.`, {
      count: saved.length,
    });
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to seed demo scores', { error: message });
    throw err;
  }
}

/**
 * Seed demo rewards for each user.
 * @param manager - Active EntityManager.
 * @param users - Array of User entities.
 * @returns Array of created Reward entities.
 * @throws {Error} If users array is empty.
 * @throws {QueryFailedError} If insert fails.
 */
async function seedDemoRewards(
  manager: EntityManager,
  users: User[],
): Promise<Reward[]> {
  log('info', 'Seeding demo rewards...');
  try {
    assertNonEmptyArray(users, 'Users array');

    const rewards: Reward[] = [];

    for (const user of users) {
      for (let i = 0; i < REWARDS_PER_USER; i++) {
        const id = deterministicUuid(`demo-reward-${user.id}-${i}`);
        assertValidUuid(id, `Reward ID for user ${user.id}, index ${i}`);

        // Random points between 5 and MAX_POINTS_REWARD
        const points = Math.round(
          (Math.random() * (MAX_POINTS_REWARD - 5) + 5) * 100,
        ) / 100;

        const reward = new Reward();
        reward.id = id;
        reward.userId = user.id;
        reward.title = `Demo Reward ${i + 1} for ${user.username}`;
        reward.description = `You earned this reward by completing demos.`;
        reward.pointsCost = points;
        reward.redeemed = i === 0; // first reward redeemed
        rewards.push(reward);
      }
    }

    const saved = await manager.save(Reward, rewards);
    log('info', `Seeded ${saved.length} demo rewards.`, {
      count: saved.length,
    });
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to seed demo rewards', { error: message });
    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// Main seeder entry point (transactional)
// ────────────────────────────────────────────────────────────

/**
 * Seed the database with reproducible demo data.
 *
 * This function:
 * - Clears all existing demo data (by role).
 * - Seeds demo users, obligations, occurrences, scores, and rewards.
 * - Everything runs inside a single database transaction.
 * - If any step fails, the transaction is rolled back and the error is thrown.
 *
 * @param managerOrRunner - Either an EntityManager (existing transaction) or a QueryRunner (to create one).
 * @returns SeedDemoResult containing all created entities.
 * @throws {Error} If seeding fails at any point.
 *
 * @example
 * // Inside an existing transaction
 * const result = await seedDemo(entityManager);
 *
 * @example
 * // With a fresh connection
 * const connection = await createConnection();
 * const runner = connection.createQueryRunner();
 * const result = await seedDemo(runner);
 * await runner.release();
 */
export async function seedDemo(
  managerOrRunner: EntityManager | QueryRunner,
): Promise<SeedDemoResult> {
  let runner: QueryRunner | null = null;
  let manager: EntityManager;

  if (managerOrRunner instanceof QueryRunner) {
    runner = managerOrRunner;
    manager = runner.manager;
  } else {
    manager = managerOrRunner;
  }

  // Only start a transaction if we aren't already inside one
  const needsTransaction = !runner || !runner.isTransactionActive;

  try {
    if (needsTransaction) {
      if (!runner) {
        // Fallback: if no runner, create one from the manager's connection
        runner = manager.connection.createQueryRunner();
        manager = runner.manager;
      }
      await runner.startTransaction();
      log('debug', 'Transaction started.');
    }

    // --- Execute seeding steps ---
    await clearDemoData(manager);
    const users = await seedDemoUsers(manager);
    const obligations = await seedDemoObligations(manager, users);
    const occurrences = await seedDemoOccurrences(manager, obligations);
    const scores = await seedDemoScores(manager, users);
    const rewards = await seedDemoRewards(manager, users);

    // --- Commit if we started the transaction ---
    if (needsTransaction && runner) {
      await runner.commitTransaction();
      log('info', 'Transaction committed successfully.');
    }

    const result: SeedDemoResult = {
      users,
      obligations,
      occurrences,
      scores,
      rewards,
    };
    log('info', 'Demo data seeded successfully.', {
      totalUsers: users.length,
      totalObligations: obligations.length,
      totalOccurrences: occurrences.length,
      totalScores: scores.length,
      totalRewards: rewards.length,
    });
    return result;
  } catch (error: unknown) {
    // Rollback if we started the transaction
    if (needsTransaction && runner && runner.isTransactionActive) {
      try {
        await runner.rollbackTransaction();
        log('warn', 'Transaction rolled back due to error.');
      } catch (rollbackError: unknown) {
        log('error', 'Rollback failed.', {
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }
    }
    // Re-throw after logging
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'Seeder failed.', { error: message });
    throw error;
  } finally {
    // If we created the runner, release it
    if (needsTransaction && runner) {
      try {
        await runner.release();
      } catch (releaseError: unknown) {
        log('error', 'Failed to release query runner.', {
          releaseError: releaseError instanceof Error ? releaseError.message : String(releaseError),
        });
      }
    }
  }
}

// ────────────────────────────────────────────────────────────
// Convenience re‑export (optional)
// ────────────────────────────────────────────────────────────

export type { SeedDemoResult, LogLevel, LogEntry, DeterministicUuidOptions };