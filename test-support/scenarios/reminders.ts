import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

type ReminderScenarioStore = {
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
  };
  notificationPreference: {
    upsert: (args: {
      where: { userId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
};

export type ReminderPreferences = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  defaultReminderDaysBefore: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

const defaultPreferences: ReminderPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  inAppEnabled: true,
  defaultReminderDaysBefore: 3,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export async function createUserWithReminderPreferences(
  prisma: ReminderScenarioStore,
  userOverrides: E2eUserInput = {},
  preferenceOverrides: Partial<ReminderPreferences> = {},
) {
  const user = await createUser(prisma, {
    displayName: 'E2E Reminders User',
    ...userOverrides,
  });
  const preferences = await addReminderPreferencesForUser(
    prisma,
    user,
    preferenceOverrides,
  );
  return { user, preferences };
}

export async function addReminderPreferencesForUser(
  prisma: Omit<ReminderScenarioStore, 'user'>,
  user: Pick<E2eUser, 'id'>,
  preferenceOverrides: Partial<ReminderPreferences> = {},
): Promise<ReminderPreferences> {
  const preferences = { ...defaultPreferences, ...preferenceOverrides };

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...preferences },
    update: preferences,
  });

  return preferences;
}
