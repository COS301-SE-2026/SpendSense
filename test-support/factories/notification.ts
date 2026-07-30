export type StoredNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  deletedAt: Date | null;
};

export type NotificationStore = {
  notification: {
    create: (args: { data: Record<string, unknown> }) => Promise<StoredNotification>;
  };
};

export type NotificationType =
  | 'REMINDER'
  | 'SCORE_CHANGE'
  | 'REWARD'
  | 'BADGE_EARNED'
  | 'PAYMENT_STATUS'
  | 'SYSTEM';

export type NotificationInput = {
  userId: string;
  type?: NotificationType;
  title?: string;
  message?: string;
  readAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
};

export async function createNotification(
  prisma: NotificationStore,
  input: NotificationInput,
) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? 'REMINDER',
      title: input.title ?? 'E2E Notification',
      message: input.message ?? 'E2E test notification.',
      readAt: input.readAt ?? null,
      deletedAt: input.deletedAt ?? null,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}
