import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithMissedCriticalPayment } from '../../../test-support/scenarios/credit-score';
import { createApiE2eFixture } from './fixtures';

type CreditScoreRisk = {
  applied: boolean;
  cap: number;
  reason: string;
};

type CreditScoreResponse = {
  applicableRisks: CreditScoreRisk;
  reasonForRiskCaps: string;
  creditScore: number;
  creditScoreTier: string;
};

type CreditScoreApiResponse = {
  data: CreditScoreResponse;
};

describe('Credit Score E2E', () => {
  it('calculates a score and applies the missed-critical-obligation cap', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const scenario = await createUserWithMissedCriticalPayment(e2e.prisma);
      const token = await createE2eAccessToken(scenario.user);

      const response = await e2e.request
        .get('/api/v1/credit-score')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const apiResponse = response.body as CreditScoreApiResponse;
      const body = apiResponse.data;

      expect(body.creditScore).toEqual(expect.any(Number));
      expect(body.creditScore).toBeGreaterThanOrEqual(300);
      expect(body.creditScore).toBeLessThanOrEqual(scenario.expectedRiskCap);
      expect(body.creditScoreTier).toEqual(expect.any(String));

      expect(body.applicableRisks).toEqual(
        expect.objectContaining({
          applied: true,
          cap: scenario.expectedRiskCap,
        }),
      );
    } finally {
      await e2e.close();
    }
  });

  it('rejects a request without an access token', async () => {
    const e2e = await createApiE2eFixture();

    try {
      await e2e.request.get('/api/v1/credit-score').expect(401);
    } finally {
      await e2e.close();
    }
  });
});
