import {
  createNotification,
  type NotificationInput,
  type NotificationStore,
  type StoredNotification,
} from '../factories/notification';
import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

type NotificationScenarioStore = NotificationStore & {
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
  };
};

export async function createUserWithNotifications(
  prisma: NotificationScenarioStore,
  notificationOverrides: Omit<NotificationInput, 'userId'>[] = [{}],
  userOverrides: E2eUserInput = {},
) {
  const user = await createUser(prisma, {
    displayName: 'E2E Notifications User',
    ...userOverrides,
  });

  const notifications: StoredNotification[] = [];
  for (const overrides of notificationOverrides) {
    notifications.push(
      await createNotification(prisma, { userId: user.id, ...overrides }),
    );
  }

  return { user, notifications };
}

export async function addNotificationsForUser(
  prisma: NotificationStore,
  user: { id: string },
  notificationOverrides: Omit<NotificationInput, 'userId'>[] = [{}],
) {
  const notifications: StoredNotification[] = [];
  for (const overrides of notificationOverrides) {
    notifications.push(
      await createNotification(prisma, { userId: user.id, ...overrides }),
    );
  }
  return notifications;
}

