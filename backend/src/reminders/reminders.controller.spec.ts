jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

describe('RemindersController', () => {
  let remindersService: jest.Mocked<
    Pick<
      RemindersService,
      'getReminderPreferences' | 'updateReminderPreferences'
    >
  >;
  let controller: RemindersController;

  beforeEach(() => {
    remindersService = {
      updateReminderPreferences: jest.fn(),
      getReminderPreferences: jest.fn(),
    };

    controller = new RemindersController(
      remindersService as unknown as RemindersService,
    );
  });

  it('updates the authenticated users reminder preferences using the service', async () => {
    const authUser = {
      email: 'testuser1@example.com',
      supabaseAuthId: 'test-supabase-user1',
    };

    const dto = { defaultReminderDaysBefore: 7 };

    const updated = {
      quietHoursStart: null,
      quietHoursEnd: null,
      emailEnabled: true,
      pushEnabled: false,
      inAppEnabled: true,
      smsEnabled: false,
      defaultReminderDaysBefore: 7,
    };
    remindersService.updateReminderPreferences.mockResolvedValue(updated);

    await expect(
      controller.updateReminderPreferences(dto, authUser),
    ).resolves.toEqual(updated);

    expect(remindersService.updateReminderPreferences).toHaveBeenCalledWith(
      authUser,
      dto,
    );
  });

  it('returns the authenticated users reminder preferences using the service', async () => {
    const authUser = {
      email: 'testuser1@example.com',
      supabaseAuthId: 'test-supabase-user1',
    };

    const preferences = {
      quietHoursStart: null,
      quietHoursEnd: null,
      emailEnabled: true,
      pushEnabled: false,
      inAppEnabled: true,
      smsEnabled: false,
      defaultReminderDaysBefore: 3,
    };
    remindersService.getReminderPreferences.mockResolvedValue(preferences);

    await expect(controller.getReminderPreferences(authUser)).resolves.toEqual(
      preferences,
    );

    expect(remindersService.getReminderPreferences).toHaveBeenCalledWith(
      authUser,
    );
  });
});
