import {
  createPaymentOccurrence,
  type PaymentOccurrenceStore,
} from '../factories/payment-occurrence';
import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

type PaymentScenarioStore = PaymentOccurrenceStore & {
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
  };
  category: {
    findFirst: (args: {
      where: { name: string; type: string };
    }) => Promise<{ id: string } | null>;
  };
};

export async function createUserWithUpcomingPayment(
  prisma: PaymentScenarioStore,
  userOverrides: E2eUserInput = {},
) {
  const user = await createUser(prisma, userOverrides);

  return {
    user,
    ...(await createUpcomingPaymentForUser(prisma, user)),
  };
}

export async function createUpcomingPaymentForUser(
  prisma: PaymentScenarioStore,
  user: E2eUser,
  input: { obligationName?: string } = {},
) {
  const category = await prisma.category.findFirst({
    where: {
      name: 'Rent',
      type: 'OBLIGATION',
    },
  });

  if (!category) {
    throw new Error(
      'The E2E category seed is missing the Rent obligation category.',
    );
  }

  const payment = await createPaymentOccurrence(prisma, {
    userId: user.id,
    categoryId: category.id,
    obligationName: input.obligationName ?? 'E2E Rent',
    amountDue: 1250,
    dueDate: new Date('2030-01-15T00:00:00.000Z'),
  });

  return payment;
}
