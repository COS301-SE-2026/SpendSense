import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resetE2eDatabase } from './reset';

const requireFromProject = createRequire(`${process.cwd()}/package.json`);
const { PrismaClient } = requireFromProject('@prisma/client') as {
  PrismaClient: new () => {
    $disconnect: () => Promise<void>;
    $queryRaw: <T>(query: TemplateStringsArray) => Promise<T>;
    $executeRawUnsafe: (query: string) => Promise<unknown>;
  };
};
const execFileAsync = promisify(execFile);

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await resetE2eDatabase(prisma);
    await execFileAsync('npm', ['run', 'prisma:seed'], {
      cwd: process.cwd(),
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main();
