import { test as base, expect } from '@playwright/test';

type E2eFixtures = {
  scenario: {
    ready: () => Promise<void>;
  };
};

export const test = base.extend<E2eFixtures>({
  scenario: async ({}, use) => {
    await use({
      ready: async () => {
        throw new Error(
          'Browser E2E authentication and scenario provisioning are not configured yet.',
        );
      },
    });
  },
});

export { expect };
