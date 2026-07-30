import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createUpcomingPaymentForUser } from './payments';
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
  preferences?: Partial<ReminderPreferences>;
  notifications?: Omit<NotificationInput, 'userId'>[];
};

const validScenarios = new Set([
  'payments.userWithUpcomingPayment',
  'reminders.userWithPreferences',
  'notifications.userWithInboxItems',
]);

const secret = process.env.E2E_SCENARIO_SECRET;
if (!secret) {
  throw new Error('E2E_SCENARIO_SECRET is required for scenario provisioning.');
}

const prisma = new PrismaClient();

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  let rawBody = '';
  for await (const chunk of request) {
    rawBody += chunk;
  }
  return JSON.parse(rawBody) as ProvisionRequest;
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/provision') {
    sendJson(response, 404, { message: 'Not found.' });
    return;
  }

  if (request.headers['x-e2e-scenario-secret'] !== secret) {
    sendJson(response, 401, { message: 'Unauthorised E2E scenario request.' });
    return;
  }

  try {
    const body = await readBody(request);
    if (
      !body.scenario ||
      !validScenarios.has(body.scenario) ||
      !body.supabaseAuthId ||
      !body.email
    ) {
      sendJson(response, 400, { message: 'Invalid E2E scenario request.' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { supabaseAuthId: body.supabaseAuthId },
      create: {
        supabaseAuthId: body.supabaseAuthId,
        email: body.email,
        displayName: 'E2E Browser User',
        onboardingCompleted: true,
      },
      update: {
        displayName: 'E2E Browser User',
        onboardingCompleted: true,
      },
    });

    if (body.scenario === 'payments.userWithUpcomingPayment') {
      const payment = await createUpcomingPaymentForUser(prisma, user, {
        obligationName: `E2E Rent ${body.label ?? 'payment'}`,
      });
      sendJson(response, 201, { user, ...payment });
      return;
    }

    if (body.scenario === 'reminders.userWithPreferences') {
      const preferences = await addReminderPreferencesForUser(
        prisma,
        user,
        body.preferences ?? {},
      );
      sendJson(response, 201, { user, preferences });
      return;
    }

    if (body.scenario === 'notifications.userWithInboxItems') {
      const notifications = await addNotificationsForUser(
        prisma,
        user,
        body.notifications ?? [{}],
      );
      sendJson(response, 201, { user, notifications });
      return;
    }

    sendJson(response, 400, { message: 'Unhandled scenario' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scenario failed.';
    sendJson(response, 500, { message });
  }
});

server.listen(3002, '0.0.0.0');

async function close(): Promise<void> {
  server.close();
  await prisma.$disconnect();
}

process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
