type StoredReminder = { id: string; status: string };

export type ReminderStore = {
  reminder: {
    create: (args: { data: Record<string, unknown> }) => Promise<StoredReminder>;
  };
};

export type ReminderInput = {
  userId: string;
  occurrenceId: string;
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
  scheduledFor?: Date;
  status?: 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'FAILED';
  message?: string;
};

export async function createReminder(prisma: ReminderStore, input: ReminderInput) {
  return prisma.reminder.create({
    data: {
      userId: input.userId,
      occurrenceId: input.occurrenceId,
      channel: input.channel ?? 'IN_APP',
      scheduledFor: input.scheduledFor ?? new Date(Date.now() - 60 * 1000),
      status: input.status ?? 'SCHEDULED',
      message: input.message ?? 'E2E scheduled reminder',
    },
  });
}
