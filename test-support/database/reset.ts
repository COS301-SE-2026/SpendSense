type E2ePrisma = {
  $queryRaw: <T>(query: TemplateStringsArray) => Promise<T>;
  $executeRawUnsafe: (query: string) => Promise<unknown>;
};

export function assertE2eDatabaseUrl(databaseUrl = process.env.DATABASE_URL): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for E2E database operations.');
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_e2e')) {
    throw new Error(
      `Refusing to reset "${databaseName}". E2E database names must end in _e2e.`,
    );
  }

  return databaseUrl;
}

export async function resetE2eDatabase(prisma: E2ePrisma): Promise<void> {
  assertE2eDatabaseUrl();

  const tableNames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tableNames.length === 0) {
    return;
  }

  const quotedTables = tableNames
    .map(({ tablename }) => `\"public\".\"${tablename.replaceAll('"', '""')}\"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
}
