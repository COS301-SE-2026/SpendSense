import { BadgeCategory } from '@prisma/client';
import request from 'supertest';
import { createApiE2eFixture } from './fixtures';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createMonthlyWrappedWithBadges } from '../../../test-support/scenarios/monthly-wrapped';

describe('Monthly Wrapped E2E', () => {
    it('E2E for getBadgesForMonth() - badges earned by the authenticated user during the requested month', async () => {
        const fixture = await createApiE2eFixture();

        const scenario = await createMonthlyWrappedWithBadges(
            fixture.prisma,
            {
                year: 2026,
                month: 8,
            },
        );

        const token = await createE2eAccessToken({
            supabaseAuthId: scenario.user.supabaseAuthId,
            email: scenario.user.email,
        });

        const response = await request(fixture.app.getHttpServer())
            .get('/api/v1/monthly-wrapped')
            .query({
                year: 2026,
                month: 8,
            })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const wrapped = response.body.data;
        expect(wrapped.year).toBe(2026);
        expect(wrapped.month).toBe(8);
        expect(wrapped.badgesEarned).toBe(2);
        expect(wrapped.badges).toHaveLength(2);
        expect(wrapped.badges[0]).toMatchObject(
            {
                badgeKey: scenario.badges.first.definition.code,
                name: 'Payment Starter',
                description: 'Made your first successful payment',
                category: BadgeCategory.PAYMENT,
                iconKey: 'payment-starter',
            }
        );
        expect(wrapped.badges[1]).toMatchObject(
            {
                badgeKey: scenario.badges.second.definition.code,
                name: 'Streak Builder',
                description: 'Built a successful payment streak',
                category: BadgeCategory.STREAK,
                iconKey: 'streak-builder',
            }
        );
        expect(wrapped.badges[0].earnedAt).toBe(scenario.badges.first.userBadge.earnedAt.toISOString());
        expect(wrapped.badges[1].earnedAt).toBe(scenario.badges.second.userBadge.earnedAt.toISOString());
    });
});