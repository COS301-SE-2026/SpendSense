import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createUpcomingPaymentForUser } from './payments';
import { createUserReadyForQuiz } from './quiz';
import { addProfileProgressForUser, type ProfileProgress } from './profile';
import {
  addReminderPreferencesForUser,
  type ReminderPreferences,
} from './reminders';
import {
  addNotificationsForUser,
  type NotificationInput,
} from './notifications';

const requireFromProject = createRequire(`${process.cwd()}/package.json`);

const { PrismaClient } = requireFromProject('@prisma/client') as {
  PrismaClient: new () => {
    user: {
      findUnique: (args: {
        where: { supabaseAuthId: string };
      }) => Promise<E2eScenarioUser | null>;
      create: (args: {
        data: Record<string, unknown>;
      }) => Promise<E2eScenarioUser>;
      upsert: (args: {
        where: { supabaseAuthId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<E2eScenarioUser>;
    };
    category: {
      findFirst: (args: {
        where: { name: string; type: string };
      }) => Promise<{ id: string } | null>;
    };
    financialObligation: {
      create: (args: {
        data: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    paymentSchedule: {
      create: (args: {
        data: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    paymentOccurrence: {
      create: (args: {
        data: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    creditProfile: {
      upsert: (args: {
        where: { userId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string; scoreTier: string }>;
    };
    gamificationProfile: {
      upsert: (args: {
        where: { userId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    userPreference: {
      upsert: (args: {
        where: { userId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    notificationPreference: {
      upsert: (args: {
        where: { userId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    notification: {
      create: (args: {
        data: Record<string, unknown>;
      }) => Promise<{ id: string }>;
    };
    $disconnect: () => Promise<void>;
  };
};

type E2eScenarioUser = {
  id: string;
  supabaseAuthId: string;
  email: string;
  displayName: string | null;
};

type ProvisionRequest = {
  scenario?: string;
  supabaseAuthId?: string;
  email?: string;
  label?: string;
  progress?: Partial<ProfileProgress>;
  preferences?: Partial<ReminderPreferences>;
  notifications?: Omit<NotificationInput, 'userId'>[];
};

const validScenarios = new Set([
  'payments.userWithUpcomingPayment',
  'quizzes.userReadyForDailyQuiz',
  'profile.userWithProgress',
  'reminders.userWithPreferences',
  'notifications.userWithInboxItems',
]);

const secret = process.env.E2E_SCENARIO_SECRET;

if (!secret) {
  throw new Error(
    'E2E_SCENARIO_SECRET is required for scenario provisioning.',
  );
}

const prisma = new PrismaClient();

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
}

async function readBody(
  request: IncomingMessage,
): Promise<ProvisionRequest> {
  let rawBody = '';
  for await (const chunk of request) {
    rawBody += chunk;
  }
  return JSON.parse(rawBody) as ProvisionRequest;
}

async function findOrCreateBrowserUser(
  supabaseAuthId: string,
  email: string,
): Promise<E2eScenarioUser> {
  return prisma.user.upsert({
    where: {
      supabaseAuthId,
    },
    create: {
      supabaseAuthId,
      email,
      displayName: 'E2E Browser User',
      onboardingCompleted: true,
    },
    update: {
      email,
      displayName: 'E2E Browser User',
      onboardingCompleted: true,
    },
  });
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, {
      status: 'ok',
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/provision') {
    sendJson(response, 404, {
      message: 'Not found.',
    });
    return;
  }

  if (request.headers['x-e2e-scenario-secret'] !== secret) {
    sendJson(response, 401, {
      message: 'Unauthorised E2E scenario request.',
    });

    return;
  }

  try {
    const body = await readBody(request);
    const { scenario, supabaseAuthId, email } = body;
    if (
      !scenario ||
      !supabaseAuthId ||
      !email ||
      !validScenarios.has(scenario)
    ) {
      sendJson(response, 400, {
        message: 'Invalid E2E scenario request.',
      });
      return;
    }
    if (scenario === 'payments.userWithUpcomingPayment') {
      const user = await findOrCreateBrowserUser(
        supabaseAuthId,
        email,
      );
      const payment = await createUpcomingPaymentForUser(
        prisma,
        user,
        {
          obligationName: `E2E Rent ${body.label ?? 'payment'}`,
        },
      );
      sendJson(response, 201, {
        user,
        ...payment,
      });
      return;
    }
    if (scenario === 'quizzes.userReadyForDailyQuiz') {
      const quizScenario = await createUserReadyForQuiz(prisma, {
        supabaseAuthId,
        email,
      });
      sendJson(response, 201, quizScenario);
      return;
    }
    if (scenario === 'profile.userWithProgress') {
      const user = await findOrCreateBrowserUser(
        supabaseAuthId,
        email,
      );
      const progress = await addProfileProgressForUser(
        prisma,
        { id: user.id },
        body.progress ?? {},
      );
      sendJson(response, 201, {
        user,
        progress,
      });
      return;
    }
    if (scenario === 'reminders.userWithPreferences') {
      const user = await findOrCreateBrowserUser(
        supabaseAuthId,
        email,
      );
      const preferences = await addReminderPreferencesForUser(
        prisma,
        user,
        body.preferences ?? {},
      );
      sendJson(response, 201, {
        user,
        preferences,
      });
      return;
    }
    if (scenario === 'notifications.userWithInboxItems') {
      const user = await findOrCreateBrowserUser(
        supabaseAuthId,
        email,
      );
      const notifications = await addNotificationsForUser(
        prisma,
        user,
        body.notifications ?? [{}],
      );
      sendJson(response, 201, {
        user,
        notifications,
      });
      return;
    }
    sendJson(response, 400, {
      message: `Unhandled E2E scenario: ${scenario}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Scenario failed.';
    sendJson(response, 500, {
      message,
    });
  }
});

server.listen(3002, '0.0.0.0');

async function close(): Promise<void> {
  server.close();
  await prisma.$disconnect();
}

process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
