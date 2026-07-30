import { test as base, expect } from '@playwright/test';

type ReminderPreferences = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  defaultReminderDaysBefore: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

type E2eFixtures = {
  scenario: {
    payments: {
      userWithUpcomingPayment: (input?: { label?: string }) => Promise<{
        obligation: { id: string; name: string };
        occurrence: { id: string };
      }>;
    };
    reminders: {
      userWithPreferences: (
        input?: Partial<ReminderPreferences>,
      ) => Promise<{
        preferences: ReminderPreferences;
      }>;
    };
  };
};

const browserUser = {
  supabaseAuthId: 'e2e-browser-user',
  email: 'e2e-browser@spendsense.test',
};

async function provision(scenario: string, body: Record<string, unknown>) {
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
    body: JSON.stringify({ scenario, ...browserUser, ...body }),
  });
  if (!response.ok) {
    throw new Error(
      `Unable to provision browser E2E scenario: ${await response.text()}`,
    );
  }

  return response.json();
}

export const test = base.extend<E2eFixtures>({
  scenario: async ({ browserName }, provideScenario) => {
    void browserName;

    await provideScenario({
      payments: {
        userWithUpcomingPayment: async (input = {}) =>
          provision('payments.userWithUpcomingPayment', {
            label: input.label,
          }),
      },
      reminders: {
        userWithPreferences: async (input = {}) =>
          provision('reminders.userWithPreferences', {
            preferences: input,
          }),
      },
    });
  },
});

export { expect };
