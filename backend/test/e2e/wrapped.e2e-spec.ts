import request from 'supertest';
import { createApiE2eFixture } from './fixtures';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createMonthlyWrappedWithBadges } from '../../../test-support/scenarios/wrapped';

type MonthlyWrappedBadge = {
  badgeKey: string;
  name: string;
  description: string;
  earnedAt: string;
};

type MonthlyWrappedResponse = {
  year: number;
  month: number;
  badgesEarned: number;
  badges: MonthlyWrappedBadge[];
};

type ApiResponse<T> = {
  data: T;
};

describe('Monthly Wrapped E2E', () => {
  it('E2E for getBadgesForMonth() - badges earned by the authenticated user during the requested month', async () => {
    const fixture = await createApiE2eFixture();
    const scenario = await createMonthlyWrappedWithBadges(fixture.prisma, {
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

    const body = response.body as ApiResponse<MonthlyWrappedResponse>;
    const wrapped = body.data;

    expect(wrapped.year).toBe(2026);
    expect(wrapped.month).toBe(8);
    expect(wrapped.badgesEarned).toBe(2);
    expect(wrapped.badges).toHaveLength(2);
    expect(wrapped.badges[0]).toMatchObject({
      badgeKey: scenario.badges.first.definition.code,
      name: 'Payment Starter',
      iconKey: 'payment-starter',
    });
    expect(wrapped.badges[1]).toMatchObject({
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
    expect(wrapped.badges[0].earnedAt).toBe(firstEarnedAt.toISOString());
    expect(wrapped.badges[1].earnedAt).toBe(secondEarnedAt.toISOString());
  });
});
