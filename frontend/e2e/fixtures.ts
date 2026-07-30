import { expect, test as base } from '@playwright/test';
import type { ProfileProgress } from '../../test-support/scenarios/profile';

type PaymentScenarioResult = {
  user: {
    id: string;
    supabaseAuthId: string;
    email: string;
    displayName: string | null;
  };
  obligation: {
    id: string;
    name: string;
  };
  occurrence: {
    id: string;
  };
};

type QuizScenarioResult = {
  user: {
    id: string;
    supabaseAuthId: string;
    email: string;
    displayName: string | null;
  };
};

type ProfileScenarioResult = {
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
  progress: ProfileProgress;
};

type E2eFixtures = {
  scenario: {
    payments: {
      userWithUpcomingPayment: (
        input?: { label?: string },
      ) => Promise<PaymentScenarioResult>;
    };
    quizzes: {
      userReadyForDailyQuiz: () => Promise<QuizScenarioResult>;
    };
    profile: {
      userWithProgress: (input?: {
        progress?: Partial<ProfileProgress>;
      }) => Promise<ProfileScenarioResult>;
    };
  };
};

const browserUser = {
  supabaseAuthId: 'e2e-browser-user',
  email: 'e2e-browser@spendsense.test',
};

async function provisionScenario<T>(
  scenario: string,
  input: Record<string, unknown> = {},
): Promise<T> {
  const scenarioUrl = process.env.E2E_SCENARIO_URL;
  const scenarioSecret = process.env.E2E_SCENARIO_SECRET;

  if (!scenarioUrl || !scenarioSecret) {
    throw new Error(
      'E2E scenario provisioning is not configured for this browser test.',
    );
  }

  const response = await fetch(`${scenarioUrl}/provision`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-e2e-scenario-secret': scenarioSecret,
    },
    body: JSON.stringify({
      scenario,
      ...browserUser,
      ...input,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Unable to provision browser E2E scenario: ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

export const test = base.extend<E2eFixtures>({
  scenario: async ({ browserName }, provideScenario) => {
    void browserName;

    await provideScenario({
      payments: {
        userWithUpcomingPayment: (
          input: { label?: string } = {},
        ) =>
          provisionScenario<PaymentScenarioResult>(
            'payments.userWithUpcomingPayment',
            {
              label: input.label,
            },
          ),
      },

      quizzes: {
        userReadyForDailyQuiz: () =>
          provisionScenario<QuizScenarioResult>(
            'quizzes.userReadyForDailyQuiz',
          ),
      },

      profile: {
        userWithProgress: (
          input: { progress?: Partial<ProfileProgress> } = {},
        ) =>
          provisionScenario<ProfileScenarioResult>(
            'profile.userWithProgress',
            {
              progress: input.progress,
            },
          ),
      },
    });
  },
});

export { expect };