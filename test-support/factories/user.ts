import { randomUUID } from 'node:crypto';

type UserStore = {
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
  };
};

export type E2eUser = {
  id: string;
  supabaseAuthId: string;
  email: string;
  displayName: string | null;
};

export type E2eUserInput = {
  supabaseAuthId?: string;
  email?: string;
  displayName?: string;
  onboardingCompleted?: boolean;
};

export async function createUser(
  prisma: UserStore,
  overrides: E2eUserInput = {},
) {
  const identifier = randomUUID();

  return prisma.user.create({
    data: {
      supabaseAuthId: overrides.supabaseAuthId ?? identifier,
      email: overrides.email ?? `e2e-${identifier}@example.test`,
      displayName: overrides.displayName ?? 'E2E Test User',
      onboardingCompleted: overrides.onboardingCompleted ?? true,
    },
  });
}
