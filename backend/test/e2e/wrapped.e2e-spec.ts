import request from 'supertest';
import { createApiE2eFixture } from './fixtures';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createMonthlyWrappedScenario } from '../../../test-support/scenarios/wrapped';
import type { WrappedSummary } from '../../src/wrapped/types/wrapped-summary.type';

type ApiResponse<T> = {
  data: T;
};

describe('Monthly Wrapped E2E', () => {
  it('E2E for getBadgesForMonth() - badges earned by the authenticated user during the requested month', async () => {
    const fixture = await createApiE2eFixture();
    try {
    const scenario = await createMonthlyWrappedScenario(fixture.prisma, {
      year: 2026,
      month: 8,
    });

    const token = await createE2eAccessToken({
      supabaseAuthId: scenario.user.supabaseAuthId,
      email: scenario.user.email,
    });

    const response = await request(fixture.app.getHttpServer())
      .get('/api/v1/wrapped/latest')
      .query({
        year: 2026,
        month: 8,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as ApiResponse<WrappedSummary>;
    const wrapped = body.data;

    expect(wrapped.month).toBe(8);
    expect(wrapped.numberBadgesEarned).toBe(2);
    expect(wrapped.arrayBadgesEarned).toHaveLength(2);
    expect(wrapped.arrayBadgesEarned[0]).toMatchObject({
      badgeKey: scenario.badges.first.definition.code,
      name: 'Payment Starter',
      iconKey: 'payment-starter',
    });
    expect(wrapped.arrayBadgesEarned[1]).toMatchObject({
      badgeKey: scenario.badges.second.definition.code,
      name: 'Streak Builder',
      iconKey: 'streak-builder',
    });

    const firstEarnedAt = scenario.badges.first.userBadge.earnedAt;
    const secondEarnedAt = scenario.badges.second.userBadge.earnedAt;
    if (!firstEarnedAt || !secondEarnedAt) {
      throw new Error(
        'Monthly Wrapped scenario badges must have earnedAt dates.',
      );
    }
    expect(wrapped.arrayBadgesEarned[0].earnedAt).toBe(
      firstEarnedAt.toISOString(),
    );
    expect(wrapped.arrayBadgesEarned[1].earnedAt).toBe(
      secondEarnedAt.toISOString(),
    );
    } finally {
      await fixture.close();
    }
  });

  it('E2E for getScoreMovementForMonth() - tracks the usersscore movement for the month', async () => {
    const fixture = await createApiE2eFixture();
    try {
    const scenario = await createMonthlyWrappedScenario(fixture.prisma, {
      year: 2026,
      month: 8,
    });

    const token = await createE2eAccessToken({
      supabaseAuthId: scenario.user.supabaseAuthId,
      email: scenario.user.email,
    });

    const response = await request(fixture.app.getHttpServer())
      .get('/api/v1/wrapped/latest')
      .query({
        year: 2026,
        month: 8,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as ApiResponse<WrappedSummary>;
    const wrapped = body.data;

    expect(wrapped.scoreStart).toBe(600);
    expect(wrapped.scoreEnd).toBe(660);
    expect(wrapped.scoreDelta).toBe(60);
    expect(wrapped.scoreTierEnd).toBe('GOOD');
    } finally {
      await fixture.close();
    }
  });
});
