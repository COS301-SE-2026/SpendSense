jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));
import { GuidanceWalkthroughStatus } from '@prisma/client';
import { GuidanceController } from './guidance.controller';
import { GuidanceService } from './guidance.service';

describe('GuidanceController', () => {
  let controller: GuidanceController;

  let guidanceService: jest.Mocked<
    Pick<GuidanceService, 'getState' | 'updateState'>
  >;

  beforeEach(() => {
    guidanceService = {
      getState: jest.fn(),
      updateState: jest.fn(),
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
});
