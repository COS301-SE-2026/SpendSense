import { Logger } from '../../lib/logger';
import { UserSeeder } from './user-seeder';
import { ObligationSeeder } from './obligation-seeder';
import { OccurrenceSeeder } from './occurrence-seeder';
import { ScoreRewardSeeder } from './score-reward-seeder';

interface SeederModule {
  seed(): Promise<void>;
  clear(): Promise<void>;
}

class SeederRegistry {
  private seeders: SeederModule[] = [];
  private logger: Logger;

  constructor(seeders: SeederModule[] = []) {
    this.seeders = seeders;
    this.logger = new Logger('SeederRegistry');
  }

  register(seeder: SeederModule): void {
    this.seeders.push(seeder);
  }

  async runAll(): Promise<void> {
    let failedCount = 0;
    for (const seeder of this.seeders) {
      const name = seeder.constructor.name;
      try {
        this.logger.info(`Clearing seeder: ${name}`);
        await seeder.clear();
      } catch (error) {
        this.logger.error(`Clear failed for seeder: ${name}`, error);
        failedCount++;
        continue;
      }
    }
    for (const seeder of this.seeders) {
      const name = seeder.constructor.name;
      try {
        this.logger.info(`Seeding seeder: ${name}`);
        await seeder.seed();
      } catch (error) {
        this.logger.error(`Seed failed for seeder: ${name}`, error);
        failedCount++;
      }
    }
    if (failedCount > 0) {
      throw new Error(`Seeder run completed with ${failedCount} failure(s)`);
    }
    this.logger.info('All seeders executed successfully');
  }
}

function createDefaultRegistry(): SeederRegistry {
  const registry = new SeederRegistry();
  registry.register(new UserSeeder());
  registry.register(new ObligationSeeder());
  registry.register(new OccurrenceSeeder());
  registry.register(new ScoreRewardSeeder());
  return registry;
}

export async function runAll(): Promise<void> {
  const registry = createDefaultRegistry();
  await registry.runAll();
}

export default SeederRegistry;