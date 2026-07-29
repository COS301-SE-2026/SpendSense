import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithProfileProgress } from '../../../test-support/scenarios/profile';
import { createApiE2eFixture } from './fixtures';

type MeResponse = {
  data: {
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
      createdAt: string;
    };
    preferences: {
      theme: string;
      currency: string;
      language: string;
      reducedMotion: boolean;
    };
    creditProfile: { scoreTier: string };
    gamificationProfile: {
      mascotLevel: number;
      coinBalance: number;
      currentPaymentStreak: number;
    };
  };
};

describe('Users E2E', () => {
  it('GET /users/me returns identity, tier, and gamification counters for the scenario user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, progress } = await createUserWithProfileProgress(
        e2e.prisma,
      );
      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as MeResponse;
      expect(body.data.user.email).toBe(user.email);
      expect(body.data.user.displayName).toBe(user.displayName);
      expect(body.data.creditProfile.scoreTier).toBe(progress.scoreTier);
      expect(body.data.gamificationProfile.mascotLevel).toBe(
        progress.mascotLevel,
      );
      expect(body.data.gamificationProfile.coinBalance).toBe(
        progress.coinBalance,
      );

      expect(body.data.gamificationProfile.currentPaymentStreak).toBe(
        progress.currentPaymentStreak,
      );
      expect(body.data.preferences.theme).toBe('SYSTEM');
      expect(body.data.preferences.currency).toBe('ZAR');
    } finally {
      await e2e.close();
    }
  });

  it('GET /users/me rejects unauthenticated requests', async () => {
    const e2e = await createApiE2eFixture();
    try {
      await e2e.request.get('/api/v1/users/me').expect(401);
    } finally {
      await e2e.close();
    }
  });

  it('GET /users/me isolates users, a token cannot read another user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user: userA } = await createUserWithProfileProgress(e2e.prisma, {
        email: 'e2e-user-a@example.test',
      });
      const { user: userB } = await createUserWithProfileProgress(e2e.prisma, {
        email: 'e2e-user-b@example.test',
      });

      const tokenA = await createE2eAccessToken(userA);

      const response = await e2e.request
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect((response.body as MeResponse).data.user.email).toBe(userA.email);
      expect((response.body as MeResponse).data.user.email).not.toBe(
        userB.email,
      );
    } finally {
      await e2e.close();
    }
  });

  it.skip('PATCH /users/me updates the display name (endpoint pending)', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithProfileProgress(e2e.prisma);
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Renamed via API' })
        .expect(200);

      const stored = await e2e.prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(stored?.displayName).toBe('Renamed via API');
    } finally {
      await e2e.close();
    }
  });

  it.skip('PATCH /users/me rejects a display name over 80 characters (endpoint pending)', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithProfileProgress(e2e.prisma);
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'a'.repeat(81) })
        .expect(400);
    } finally {
      await e2e.close();
    }
  });

  it.skip('PATCH /users/me/preferences updates theme and persists (endpoint pending)', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithProfileProgress(e2e.prisma);
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/users/me/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'DARK' })
        .expect(200);

      const stored = await e2e.prisma.userPreference.findUnique({
        where: { userId: user.id },
      });
      expect(stored?.theme).toBe('DARK');
    } finally {
      await e2e.close();
    }
  });
});
