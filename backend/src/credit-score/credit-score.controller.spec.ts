import { CreditScoreController } from './credit-score.controller';
import type { CreditScoreService } from './credit-score.service';
import type { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('CreditScoreController', () => {
  let controller: CreditScoreController;
  let creditScoreService: jest.Mocked<
    Pick<CreditScoreService, 'getCreditScore'>
  >;
  let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

  const authUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  } as AuthUser;

  beforeEach(() => {
    creditScoreService = {
      getCreditScore: jest.fn(),
    };
    usersService = {
      findOrCreateUser: jest.fn(),
    };

    controller = new CreditScoreController(
      creditScoreService as unknown as CreditScoreService,
      usersService as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resolves the authenticated user then returns their credit score', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);
    const creditScorePayload = {
      applicableRisks: { applied: false, cap: 850, reason: 'NONE' },
      reasonForRiskCaps: '',
      creditScore: 712,
      creditScoreTier: 'EXCELLENT',
      savingsBuffer: 0.1,
      onTimePaymentCount: 8,
      onLatePaymentCount: 1,
    };
    creditScoreService.getCreditScore.mockResolvedValue(creditScorePayload);

    await expect(controller.getInsights(authUser)).resolves.toEqual(
      creditScorePayload,
    );
    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(creditScoreService.getCreditScore).toHaveBeenCalledWith('user-1');
  });
});
