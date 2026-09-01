import { MonthlyWrappedController } from './wrapped.controller';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('MonthlyWrappedController', () => {
  const authUser: AuthUser = {
    supabaseAuthId: 'auth-user-123',
    email: 'user@example.com',
  };
  const user = { id: 'user-123' };
  const usersService = { findOrCreateUser: jest.fn() };
  const monthlyWrappedService = { getWrappedResponse: jest.fn() };
  const controller = new MonthlyWrappedController(
    monthlyWrappedService as never,
    usersService as never,
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    usersService.findOrCreateUser.mockResolvedValue(user);
    monthlyWrappedService.getWrappedResponse.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requests the previous UTC month', async () => {
    jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));

    await controller.getMonthlyWrapped(authUser);

    expect(monthlyWrappedService.getWrappedResponse).toHaveBeenCalledWith(
      user.id,
      '2026-08',
    );
  });

  it('rolls January back to December of the previous year', async () => {
    jest.setSystemTime(new Date('2027-01-15T12:00:00.000Z'));

    await controller.getMonthlyWrapped(authUser);

    expect(monthlyWrappedService.getWrappedResponse).toHaveBeenCalledWith(
      user.id,
      '2026-12',
    );
  });
});
