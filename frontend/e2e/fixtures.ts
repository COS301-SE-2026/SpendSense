import { test as base, expect } from '@playwright/test';

type E2eFixtures = {
  scenario: {
    payments: {
      userWithUpcomingPayment: (input?: { label?: string }) => Promise<{
        obligation: { id: string; name: string };
        occurrence: { id: string };
      }>;
    };
  };
};

const browserUser = {
  supabaseAuthId: 'e2e-browser-user',
  email: 'e2e-browser@spendsense.test',
};

export const test = base.extend<E2eFixtures>({
  scenario: async ({ browserName }, provideScenario) => {
    void browserName;

    await provideScenario({
      payments: {
        userWithUpcomingPayment: async (input = {}) => {
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
              scenario: 'payments.userWithUpcomingPayment',
              ...browserUser,
              label: input.label,
            }),
          });
          if (!response.ok) {
            throw new Error(
              `Unable to provision browser E2E scenario: ${await response.text()}`,
            );
          }

          return response.json();
        },
      },
    });
  },
});

export { expect };
