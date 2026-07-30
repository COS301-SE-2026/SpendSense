import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createUpcomingPaymentForUser } from './payments';
import { createUserReadyForQuiz } from './quiz';

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
};

const secret = process.env.E2E_SCENARIO_SECRET;

if (!secret) {
  throw new Error(
    'E2E_SCENARIO_SECRET is required for scenario provisioning.',
  );
}

const prisma = new PrismaClient();

function sendJson(
  response:ServerResponse,
  status:number,
  body:unknown,
):void{
  response.writeHead(status,{
    'content-type':'application/json',
  });
  response.end(JSON.stringify(body));
}

async function readBody(
  request:IncomingMessage,
):Promise<ProvisionRequest> {
  let rawBody = '';
  for await (const chunk of request) {
    rawBody += chunk;
  }
  return JSON.parse(rawBody) as ProvisionRequest;
}

async function findOrCreateBrowserUser(
  supabaseAuthId:string,
  email:string,
):Promise<E2eScenarioUser>{
  const existingUser = await prisma.user.findUnique({
    where:{
      supabaseAuthId,
    },
  });
  if(existingUser){
    return existingUser;
  }
  return prisma.user.create({
    data:{
      supabaseAuthId,
      email,
      displayName:'E2E Browser User',
      onboardingCompleted:true,
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
    if (!body.supabaseAuthId || !body.email || !body.scenario) {
      sendJson(response, 400, {
        message: 'Invalid E2E scenario request.',
      });
      return;
    }

    if (body.scenario === 'payments.userWithUpcomingPayment') {
      const user = await findOrCreateBrowserUser(
        body.supabaseAuthId,
        body.email,
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
    if (body.scenario === 'quizzes.userReadyForDailyQuiz') {
      const quizScenario = await createUserReadyForQuiz(prisma, {
        supabaseAuthId: body.supabaseAuthId,
        email: body.email,
      });
      sendJson(response, 201, quizScenario);
      return;
    }
    sendJson(response, 400, {
      message: `Unknown E2E scenario: ${body.scenario}`,
    });
  }catch(error){
    const message=error instanceof Error?error.message:'Scenario failed.';
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