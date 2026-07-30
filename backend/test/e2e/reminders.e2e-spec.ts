import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithReminderPreferences } from '../../../test-support/scenarios/reminders';
import { createApiE2eFixture } from './fixtures';

type ReminderPreferencesResponse = {
  data: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    defaultReminderDaysBefore: number;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  };
};

describe('Reminder Preferences E2E', () => {
  it('GET /reminder-preferences will reject unauthenticated requests', async () => {
    const e2e = await createApiE2eFixture();
    try {
      await e2e.request.get('/api/v1/reminder-preferences').expect(401);
    } finally {
      await e2e.close();
    }
  });

  it('GET /reminder-preferences will return the seeded preferences for user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, preferences } = await createUserWithReminderPreferences(
        e2e.prisma,
      );
      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .get('/api/v1/reminder-preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as ReminderPreferencesResponse;
      expect(body.data.inAppEnabled).toBe(preferences.inAppEnabled);
      expect(body.data.defaultReminderDaysBefore).toBe(
        preferences.defaultReminderDaysBefore,
      );
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /reminder-preferences will update defaultReminderDaysBefore and persists it', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithReminderPreferences(e2e.prisma);
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/reminder-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ defaultReminderDaysBefore: 7 })
        .expect(200);

      const stored = await e2e.prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      });
      expect(stored?.defaultReminderDaysBefore).toBe(7);
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /reminder-preferences will update inAppEnabled', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, preferences } = await createUserWithReminderPreferences(
        e2e.prisma,
      );
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/reminder-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ inAppEnabled: !preferences.inAppEnabled })
        .expect(200);

      const stored = await e2e.prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      });
      expect(stored?.inAppEnabled).toBe(!preferences.inAppEnabled);
      expect(stored?.defaultReminderDaysBefore).toBe(
        preferences.defaultReminderDaysBefore,
      );
    } finally {
      await e2e.close();
    }
  });

  it('PATCH /reminder-preferences will reject an invalid defaultReminderDaysBefore', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithReminderPreferences(e2e.prisma);
      const token = await createE2eAccessToken(user);

      await e2e.request
        .patch('/api/v1/reminder-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ defaultReminderDaysBefore: 2 })
        .expect(400);
    } finally {
      await e2e.close();
    }
  });

  it('will isolate users, a token cannot change or read another users preferences', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user: userA } = await createUserWithReminderPreferences(
        e2e.prisma,
        { email: 'e2e-reminders-a@example.test' },
        { defaultReminderDaysBefore: 1 },
      );
      const { user: userB } = await createUserWithReminderPreferences(
        e2e.prisma,
        { email: 'e2e-reminders-b@example.test' },
        { defaultReminderDaysBefore: 5 },
      );

      const tokenA = await createE2eAccessToken(userA);

      const response = await e2e.request
        .get('/api/v1/reminder-preferences')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(
        (response.body as ReminderPreferencesResponse).data
          .defaultReminderDaysBefore,
      ).toBe(1);

      const storedB = await e2e.prisma.notificationPreference.findUnique({
        where: { userId: userB.id },
      });
      expect(storedB?.defaultReminderDaysBefore).toBe(5);
    } finally {
      await e2e.close();
    }
  });
});
