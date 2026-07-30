import {
  createPaymentOccurrence,
  type PaymentOccurrenceStore,
} from '../factories/payment-occurrence';
import { createReminder, type ReminderStore } from '../factories/reminder';
import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

type SchedulerScenarioStore = PaymentOccurrenceStore &
  ReminderStore & {
    user: {
      create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
    };
    category: {
      findFirst: (args: {
        where: { name: string; type: string };
      }) => Promise<{ id: string } | null>;
    };
  };

async function getRentCategory(prisma: Pick<SchedulerScenarioStore, 'category'>) {
  const category = await prisma.category.findFirst({
    where: { name: 'Rent', type: 'OBLIGATION' },
  });

  if (!category) {
    throw new Error(
      'The E2E category seed is missing the Rent obligation.',
    );
  }

  return category;
}

export async function createUserWithOverdueEligibleOccurrence(
  prisma: SchedulerScenarioStore,
  userOverrides: E2eUserInput = {},
) {
  const user = await createUser(prisma, {
    displayName: 'E2E scheduler user',
    ...userOverrides,
  });
  const category = await getRentCategory(prisma);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { obligation, occurrence } = await createPaymentOccurrence(prisma, {
    userId: user.id,
    categoryId: category.id,
    obligationName: 'E2E overdue rent',
    amountDue: 900,
    dueDate: yesterday,
    status: 'PENDING',
  });

  return { user, obligation, occurrence };
}

export async function createUserWithMissedEligibleOccurrence(
  prisma: SchedulerScenarioStore,
  userOverrides: E2eUserInput = {},
) {
  const user = await createUser(prisma, {
    displayName: 'E2E scheduler user',
    ...userOverrides,
  });
  const category = await getRentCategory(prisma);

  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

  const { obligation, occurrence } = await createPaymentOccurrence(prisma, {
    userId: user.id,
    categoryId: category.id,
    obligationName: 'E2E long overdue rent',
    amountDue: 900,
    dueDate: thirtyOneDaysAgo,
    status: 'OVERDUE',
    overdueAt: thirtyOneDaysAgo,
  });

  return { user, obligation, occurrence };
}

export async function createUserWithDueReminder(
  prisma: SchedulerScenarioStore,
  userOverrides: E2eUserInput = {},
) {
  const user = await createUser(prisma, {
    displayName: 'E2E scheduler user',
    ...userOverrides,
  });
  const category = await getRentCategory(prisma);

  const { occurrence } = await createPaymentOccurrence(prisma, {
    userId: user.id,
    categoryId: category.id,
    obligationName: 'E2E reminder rent',
    amountDue: 900,
  });

  const reminder = await createReminder(prisma, {
    userId: user.id,
    occurrenceId: occurrence.id,
    scheduledFor: new Date(Date.now() - 60 * 1000),
  });

  return { user, occurrence, reminder };
}
