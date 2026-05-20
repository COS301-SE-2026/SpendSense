jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { MascotMood } from '@prisma/client';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

describe('GamificationController', () => {
  let controller: GamificationController;
  let gamificationService: jest.Mocked<
    Pick<GamificationService, 'getGamificationProfile'>
  >;

  beforeEach(() => {
    gamificationService = {
      getGamificationProfile: jest.fn(),
    };

    controller = new GamificationController(
      gamificationService as unknown as GamificationService,
    );
  });

  it('returns the authenticated user gamification profile from the service', async () => {
    const authUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const gamificationProfile = {
      coins: 0,
      xp: 0,
      mascotLevel: 1,
      mascotMood: MascotMood.NEUTRAL,
      paymentStreak: 0,
      longestStreak: 0,
      knowledgeStreak: 0,
      longestKnowledgeStreak: 0,
      badges: [],
    };

    gamificationService.getGamificationProfile.mockResolvedValue(
      gamificationProfile,
    );

    await expect(controller.getGamificationProfile(authUser)).resolves.toEqual(
      gamificationProfile,
    );
    expect(gamificationService.getGamificationProfile).toHaveBeenCalledWith(
      authUser,
    );
  });
});
