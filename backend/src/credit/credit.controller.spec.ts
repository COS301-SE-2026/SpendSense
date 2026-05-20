jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { ScoreTier } from '@prisma/client';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

describe('CreditController', () => {
  let controller: CreditController;
  let creditService: jest.Mocked<Pick<CreditService, 'getCreditProfile'>>;

  beforeEach(() => {
    creditService = {
      getCreditProfile: jest.fn(),
    };

    controller = new CreditController(creditService as unknown as CreditService);
  });

  it('returns the authenticated user credit profile from the service', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const creditProfile = {
      currentScore: 600,
      previousScore: 600,
      scoreTier: ScoreTier.GOOD,
      onTimeCount: 0,
      lateCount: 0,
      missedCount: 0,
      lastCalculatedAt: null,
    };

    creditService.getCreditProfile.mockResolvedValue(creditProfile);

    await expect(controller.getCreditProfile(authUser)).resolves.toEqual(
      creditProfile,
    );
    expect(creditService.getCreditProfile).toHaveBeenCalledWith(authUser);
  });
});
