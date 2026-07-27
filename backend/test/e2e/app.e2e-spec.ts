import { createApiE2eFixture } from './fixtures';

describe('E2E API fixture', () => {
  it('starts the application with production HTTP configuration', async () => {
    const e2e = await createApiE2eFixture();

    try {
      await e2e.request.get('/api/v1/health').expect(200);
    } finally {
      await e2e.close();
    }
  });
});
