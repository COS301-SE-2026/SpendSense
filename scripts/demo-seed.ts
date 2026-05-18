typescript
#!/usr/bin/env node

/**
 * Entry point for the demo seed script.
 *
 * Orchestrates the complete lifecycle: parses CLI options, initialises the
 * database connection, optionally clears previous demo data, invokes each seed
 * service in dependency order, and logs a summary. The script exits with code 0
 * on success and 1 on any failure.
 *
 * @packageDocumentation
 * @module scripts/demo-seed
 */

import { Command } from 'commander';
import {
  createConnection,
  closeConnection,
} from '../src/db/connection';
import { seedUsers } from '../src/seed/user-seeder';
import { seedObligations } from '../src/seed/obligation-seeder';
import { seedOccurrences } from '../src/seed/occurrence-seeder';
import { seedScores } from '../src/seed/score-seeder';
import { clearDemoData } from '../src/seed/clear-demo-data';

// ---------------------------------------------------------------------------
// Constants & Environment
// ---------------------------------------------------------------------------

/** Default severity level when `LOG_LEVEL` is not set or invalid. */
const DEFAULT_LOG_LEVEL = 'INFO';

/** Supported log level severity names. */
type LogLevelName = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Numeric mapping of log level severity. */
const LOG_LEVEL_MAP: Record<LogLevelName, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Numeric threshold for the current process's log level.
 * Reads from `LOG_LEVEL` environment variable, falls back to INFO.
 */
const LOG_THRESHOLD: number =
  LOG_LEVEL_MAP[(process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL).toUpperCase() as LogLevelName] ??
  LOG_LEVEL_MAP.INFO;

/**
 * Maximum time to wait for database connection (in milliseconds).
 */
const DB_CONNECTION_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Structured Logger
// ---------------------------------------------------------------------------

/**
 * Returns an ISO-8601 timestamp at the moment of call.
 * Optimised for readability, not for hot paths (seed scripts are I/O bound).
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Logs a message with a severity level, timestamp, and optional structured data.
 *
 * @param level   - Case-insensitive severity name.
 * @param message - Human-readable log message.
 * @param args    - Optional arguments to include as structured data.
 *                  Error objects are serialised with their stack traces.
 */
function log(level: LogLevelName, message: string, ...args: unknown[]): void {
  const normalizedLevel = level.toUpperCase() as LogLevelName;
  const numericLevel = LOG_LEVEL_MAP[normalizedLevel] ?? LOG_LEVEL_MAP.DEBUG;

  if (numericLevel < LOG_THRESHOLD) {
    return;
  }

  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${normalizedLevel}]`;

  // Serialise args safely, handling Error objects and circular references.
  let serialisedArgs = '';
  if (args.length > 0) {
    try {
      const processedArgs = args.map((arg) =>
        arg instanceof Error
          ? { message: arg.message, stack: arg.stack, name: arg.name }
          : arg,
      );
      serialisedArgs = ' ' + JSON.stringify(processedArgs, getCircularReplacer());
    } catch {
      serialisedArgs = ' <failed to serialise arguments>';
    }
  }

  const output = args.length > 0 ? `${message}${serialisedArgs}` : message;

  if (numericLevel >= LOG_LEVEL_MAP.ERROR) {
    console.error(prefix, output);
  } else {
    console.log(prefix, output);
  }
}

/**
 * JSON.stringify replacer that handles circular references by replacing them
 * with a marker string.
 */
function getCircularReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) {
        return '[Circular]';
      }
      seen.add(value as object);
    }
    return value;
  };
}

// ---------------------------------------------------------------------------
// Environment & Configuration Validation
// ---------------------------------------------------------------------------

/**
 * Validates required environment variables and returns a strongly typed config.
 *
 * @returns A configuration object derived from environment variables.
 * @throws {Error} If a required variable is missing or malformed.
 */
interface SeedConfig {
  readonly databaseUrl: string;
  readonly logLevel: LogLevelName;
}

function validateEnvironment(): SeedConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error(
      'Missing or invalid required environment variable: DATABASE_URL',
    );
  }

  // Basic URL validation (not exhaustive, but catches common mistakes)
  try {
    new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  const logLevelRaw = process.env.LOG_LEVEL?.toUpperCase() as LogLevelName;
  const logLevel: LogLevelName = logLevelRaw && LOG_LEVEL_MAP[logLevelRaw] !== undefined
    ? logLevelRaw
    : DEFAULT_LOG_LEVEL as LogLevelName;

  return { databaseUrl, logLevel };
}

// ---------------------------------------------------------------------------
// CLI Options Validation
// ---------------------------------------------------------------------------

/** Parsed and validated CLI options. */
interface ValidatedCliOptions {
  /** When `true`, all demo data is cleared before seeding. */
  readonly clear: boolean;
  /** When `true`, only prints what would be done without making changes. */
  readonly dryRun: boolean;
}

/**
 * Validates and normalises CLI options from Commander.
 *
 * @param rawOptions - Unvalidated options object (keys are strings).
 * @returns A validated options object.
 * @throws {TypeError} If `clear` is not a boolean.
 * @throws {TypeError} If `dryRun` is not a boolean.
 * @throws {Error}     If unknown options are present (security check).
 */
function validateCliOptions(rawOptions: Record<string, unknown>): ValidatedCliOptions {
  const allowedKeys = new Set(['clear', 'dryRun']);
  const unknownKeys = Object.keys(rawOptions).filter((k) => !allowedKeys.has(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Unexpected CLI options: ${unknownKeys.join(', ')}`);
  }

  if (typeof rawOptions.clear !== 'boolean') {
    throw new TypeError(
      `Option '--clear' must be a boolean, but received ${typeof rawOptions.clear}`,
    );
  }

  if (typeof rawOptions.dryRun !== 'boolean') {
    throw new TypeError(
      `Option '--dry-run' must be a boolean, but received ${typeof rawOptions.dryRun}`,
    );
  }

  return {
    clear: rawOptions.clear,
    dryRun: rawOptions.dryRun,
  };
}

// ---------------------------------------------------------------------------
// Program Definition
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('demo-seed')
  .description('Seed the database with repeatable demo data')
  .option(
    '--clear',
    'Tear down all existing demo data before running the seed (ensures idempotency)',
    false,
  )
  .option(
    '--dry-run',
    'Simulate the seed operation without modifying the database',
    false,
  )
  .parse(process.argv);

const rawOptions = program.opts<Record<string, unknown>>();

let options: ValidatedCliOptions;
try {
  options = validateCliOptions(rawOptions);
} catch (validationError: unknown) {
  const message =
    validationError instanceof Error
      ? validationError.message
      : String(validationError);
  log('ERROR', 'Invalid CLI options', validationError);
  process.exitCode = 1;
  process.exit(); // eslint-disable-line no-process-exit
}

// ---------------------------------------------------------------------------
// Seeding Orchestration
// ---------------------------------------------------------------------------

/** Aggregate counts of seeded records. */
interface SeedResult {
  readonly users: number;
  readonly obligations: number;
  readonly occurrences: number;
  readonly scores: number;
}

/**
 * Runs all seed operations in the required dependency order.
 *
 * Users -> Obligations -> Occurrences -> Scores.
 *
 * @param dryRun - If true, only log the steps without executing seeds.
 * @returns A summary of how many records were seeded (or would be seeded).
 * @throws If any individual seed step fails (errors bubble up).
 */
async function executeAllSeeds(dryRun: boolean): Promise<SeedResult> {
  let usersSeeded = 0;
  let obligationsSeeded = 0;
  let occurrencesSeeded = 0;
  let scoresSeeded = 0;

  if (dryRun) {
    log('INFO', 'Dry-run mode: no data will be written');
    log('INFO', 'Seeds that would be executed: users, obligations, occurrences, scores');
    return { users: 0, obligations: 0, occurrences: 0, scores: 0 };
  }

  log('INFO', 'Starting user seeding...');
  usersSeeded = await seedUsers();
  log('INFO', `Seeded ${usersSeeded} users`);

  log('INFO', 'Starting obligation seeding...');
  obligationsSeeded = await seedObligations();
  log('INFO', `Seeded ${obligationsSeeded} obligations`);

  log('INFO', 'Starting occurrence seeding...');
  occurrencesSeeded = await seedOccurrences();
  log('INFO', `Seeded ${occurrencesSeeded} occurrences`);

  log('INFO', 'Starting score and reward seeding...');
  scoresSeeded = await seedScores();
  log('INFO', `Seeded ${scoresSeeded} score/reward records`);

  return {
    users: usersSeeded,
    obligations: obligationsSeeded,
    occurrences: occurrencesSeeded,
    scores: scoresSeeded,
  };
}

/**
 * Clears existing demo data if the `--clear` flag is set.
 *
 * @param clearFlag - Whether to perform the clear operation.
 * @param dryRun    - If true, only log the action without clearing.
 * @throws If the underlying `clearDemoData` call fails.
 */
async function clearIfRequested(clearFlag: boolean, dryRun: boolean): Promise<void> {
  if (!clearFlag) {
    log('DEBUG', 'Skipping data clear (--clear flag not set)');
    return;
  }

  if (dryRun) {
    log('INFO', 'Dry-run: would clear existing demo data');
    return;
  }

  log('INFO', 'Clearing existing demo data (--clear flag detected)');
  await clearDemoData();
  log('INFO', 'Demo data removal completed successfully');
}

/**
 * Safely closes the database connection, logging any errors but never throwing.
 */
async function safeCloseConnection(): Promise<void> {
  try {
    await closeConnection();
    log('DEBUG', 'Database connection closed successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('WARN', `Failed to close database connection gracefully: ${message}`, err);
  }
}

// ---------------------------------------------------------------------------
// Global Exception Handlers
// ---------------------------------------------------------------------------

/**
 * Handles uncaught exceptions by logging and exiting with failure code.
 */
process.on('uncaughtException', (err: Error) => {
  log('ERROR', 'Uncaught exception', err);
  // Attempt to close connection gracefully
  safeCloseConnection().finally(() => {
    process.exitCode = 1;
    process.exit(); // eslint-disable-line no-process-exit
  });
});

/**
 * Handles unhandled promise rejections by logging and exiting with failure code.
 */
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  log('ERROR', 'Unhandled promise rejection', error);
  safeCloseConnection().finally(() => {
    process.exitCode = 1;
    process.exit(); // eslint-disable-line no-process-exit
  });
});

// ---------------------------------------------------------------------------
// Main Execution
// ---------------------------------------------------------------------------

/**
 * Main entry point for the seed script.
 *
 * Validates environment, connects to the database, optionally clears,
 * seeds data, and logs a summary.
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  // Validate environment variables
  let config: SeedConfig;
  try {
    config = validateEnvironment();
    log('DEBUG', 'Environment validated successfully');
  } catch (envErr: unknown) {
    log('ERROR', 'Environment validation failed', envErr);
    process.exitCode = 1;
    return;
  }

  log('INFO', `Log level set to ${config.logLevel}`);
  log('INFO', `Database URL: ${maskSensitive(config.databaseUrl)}`);

  // Connect to database
  try {
    log('INFO', 'Connecting to database...');
    await createConnection({
      url: config.databaseUrl,
      timeout: DB_CONNECTION_TIMEOUT_MS,
    });
    log('INFO', 'Database connection established');
  } catch (connErr: unknown) {
    log('ERROR', 'Failed to connect to database', connErr);
    process.exitCode = 1;
    return;
  }

  // Optionally clear demo data
  try {
    await clearIfRequested(options.clear, options.dryRun);
  } catch (clearErr: unknown) {
    log('ERROR', 'Failed to clear demo data', clearErr);
    await safeCloseConnection();
    process.exitCode = 1;
    return;
  }

  // Execute seeds
  let result: SeedResult;
  try {
    result = await executeAllSeeds(options.dryRun);
  } catch (seedErr: unknown) {
    log('ERROR', 'Seeding failed', seedErr);
    await safeCloseConnection();
    process.exitCode = 1;
    return;
  }

  // Close connection
  await safeCloseConnection();

  // Log summary
  const duration = Date.now() - startTime;
  log('INFO', `Seeding completed in ${duration}ms`);
  log('INFO', `Summary: ${result.users} users, ${result.obligations} obligations, ` +
    `${result.occurrences} occurrences, ${result.scores} scores/rewards`);
}

/**
 * Masks sensitive parts of a database URL for logging.
 *
 * @param url - Full database URL.
 * @returns Masked URL (password replaced with asterisks).
 */
function maskSensitive(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '*'.repeat(parsed.password.length);
    }
    return parsed.toString();
  } catch {
    return '<invalid-url>';
  }
}

// Run the main function, catch any unhandled errors
main().catch((err: unknown) => {
  log('ERROR', 'Unexpected error in main', err);
  safeCloseConnection().finally(() => {
    process.exitCode = 1;
    process.exit(); // eslint-disable-line no-process-exit
  });
});