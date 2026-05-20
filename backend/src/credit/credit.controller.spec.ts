jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { ScoreTier } from '@prisma/client';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

describe('CreditController', () => {
  let controller: CreditController;
  let creditService: jest.Mocked<
    Pick<CreditService, 'getCreditProfile' | 'getCreditProfileEvents'>
  >;

  beforeEach(() => {
    creditService = {
      getCreditProfile: jest.fn(),
      getCreditProfileEvents: jest.fn(),
    };

    controller = new CreditController(
      creditService as unknown as CreditService,
    );
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

  it('returns the authenticated user credit profile events from the service', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const events = [
      {
        id: 'score-event-1',
        eventType: 'PAYMENT_ON_TIME' as const,
        pointsDelta: 8,
        scoreBefore: 704,
        scoreAfter: 712,
        explanation: 'Paid Subscription on time.',
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
      },
    ];

    creditService.getCreditProfileEvents.mockResolvedValue(events);

    await expect(controller.getCreditProfileEvents(authUser)).resolves.toEqual(
      events,
    );
    expect(creditService.getCreditProfileEvents).toHaveBeenCalledWith(authUser);
  });
});
