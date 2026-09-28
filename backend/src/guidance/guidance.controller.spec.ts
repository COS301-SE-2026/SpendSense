jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));
import { GuidanceWalkthroughStatus } from '@prisma/client';
import { GuidanceController } from './guidance.controller';
import { GuidanceService } from './guidance.service';

describe('GuidanceController', () => {
  let controller: GuidanceController;

  let guidanceService: jest.Mocked<
    Pick<GuidanceService, 'getState' | 'updateState' | 'getDailyFacts'>
  >;

  beforeEach(() => {
    guidanceService = {
      getState: jest.fn(),
      updateState: jest.fn(),
      getDailyFacts: jest.fn(),
    };

    controller = new GuidanceController(
      guidanceService as unknown as GuidanceService,
    );
  });

  it('will return the users guidance state', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user',
      email: 'test-user@example.com',
    };

    const guidanceState = {
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthrough: {
        status: GuidanceWalkthroughStatus.NOT_STARTED,
        currentStep: 0,
      },
      dismissedTipIds: [],
      updatedAt: null,
    };

    guidanceService.getState.mockResolvedValue(guidanceState);

    await expect(controller.getState(authUser)).resolves.toEqual(guidanceState);

    expect(guidanceService.getState).toHaveBeenCalledWith(authUser);
  });

  it('will update the user guidance state through the service', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user',
      email: 'test-user@example.com',
    };

    const dto = {
      tipsEnabled: false,
    };

    const result = {
      tipsEnabled: false,
      dailyExpansionEnabled: true,
      walkthrough: {
        status: GuidanceWalkthroughStatus.NOT_STARTED,
        currentStep: 0,
      },
      dismissedTipIds: [],
      updatedAt: null,
    };

    guidanceService.updateState.mockResolvedValue(result);

    await expect(controller.updateState(authUser, dto)).resolves.toEqual(
      result,
    );

    expect(guidanceService.updateState).toHaveBeenCalledWith(authUser, dto);
  });

  it('will return the daily guidance facts', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user',
      email: 'test-user@example.com',
    };

    const dailyFacts = {
      localDate: '2026-09-20',
      asOf: '2026-09-20T10:00:00.000Z',
      payments: {
        contributionCount: 0,
        completedOccurrenceCount: 0,
        totalsByCurrency: [],
      },
      dailyQuiz: {
        status: 'UNAVAILABLE' as const,
        sessionId: null,
        canStart: false,
        canResume: false,
      },
      streaks: {
        payment: 0,
        knowledge: 0,
      },
    };

    guidanceService.getDailyFacts.mockResolvedValue(dailyFacts);

    await expect(controller.getDaily(authUser)).resolves.toEqual(dailyFacts);

    expect(guidanceService.getDailyFacts).toHaveBeenCalledWith(authUser);
  });
});
