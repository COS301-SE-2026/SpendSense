import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithInsightHistory } from '../../../test-support/scenarios/insights';
import { createApiE2eFixture } from './fixtures';

type InsightCard = {
  key: string;
  title: string;
  value: string;
  explanation: string;
  severity: string;
  link?: string;
};

type InsightsResponse = {
  asOf: string;
  insights: InsightCard[];
};

type InsightsApiResponse = {
  data: InsightsResponse;
};

function findInsight(body: InsightsResponse, key: string): InsightCard {
  const insight = body.insights.find((item) => item.key === key);

  if (!insight) {
    throw new Error(`Expected the API response to contain insight: ${key}`);
  }

  return insight;
}

function compactMoney(value: string): string {
  return value.replace(/[\s\u00a0]/g, '');
}

describe('Insights E2E', () => {
  it('returns five insight cards calculated from scenario-created data', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const scenario = await createUserWithInsightHistory(e2e.prisma);
      const token = await createE2eAccessToken(scenario.user);

      const response = await e2e.request
        .get('/api/v1/insights')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const apiResponse = response.body as InsightsApiResponse;
      const body = apiResponse.data;

      expect(Date.parse(body.asOf)).not.toBeNaN();
      expect(body.insights).toHaveLength(5);
      expect(body.insights.map((insight) => insight.key)).toEqual([
        'on-time-rate',
        'obligation-trend',
        'upcoming-pressure',
        'category-breakdown',
        'payment-streak',
      ]);

      const onTimeRate = findInsight(body, 'on-time-rate');

      expect(onTimeRate).toMatchObject({
        title: 'On-time payment rate',
        value: scenario.expectedOnTimeRate,
        severity: 'info',
      });
      expect(onTimeRate.explanation).toContain(
        '3 of 4 eligible payments were on time',
      );
      expect(onTimeRate.explanation).toContain(
        '25 percentage points higher than last month',
      );

      const upcomingPressure = findInsight(body, 'upcoming-pressure');

      expect(compactMoney(upcomingPressure.value)).toBe(
        `R${scenario.expectedUpcomingAmount}`,
      );
      expect(upcomingPressure.explanation).toContain(
        `${scenario.expectedUpcomingPaymentCount} payments are due`,
      );

      expect(findInsight(body, 'obligation-trend').value).toEqual(
        expect.any(String),
      );
      expect(findInsight(body, 'category-breakdown').value).toEqual(
        expect.any(String),
      );
      expect(findInsight(body, 'payment-streak').value).toEqual(
        expect.any(String),
      );
    } finally {
      await e2e.close();
    }
  });

  it('rejects a request without an access token', async () => {
    const e2e = await createApiE2eFixture();

    try {
      await e2e.request.get('/api/v1/insights').expect(401);
    } finally {
      await e2e.close();
    }
  });
});
