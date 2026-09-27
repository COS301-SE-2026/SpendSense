import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationsService } from './simulations.service';
import { simulationStatusSession } from './simulation-status.fixture';

const sessionId = '00000000-0000-4000-8000-000000000090';
const eventId = '00000000-0000-4000-8000-000000000091';
const idempotencyKey = '00000000-0000-4000-8000-000000000092';
const now = new Date('2026-09-18T09:00:00.000Z');

const resumableSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'PAUSED',
  timedMode: true,
  pausedDecisionSeconds: 14,
  presentationHold: 'NONE',
  events: [],
  ...overrides,
});

const refreshedSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  ...simulationStatusSession(
    now,
    'ACTIVE',
    new Date(now.getTime() + 14_000),
    overrides,
  ),
});

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

describe('SimulationsService resumeSession', () => {
  let prisma: {
    simulationSession: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    simulationAction: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    $transaction: jest.Mock<
      Promise<unknown>,
      [(tx: unknown) => Promise<unknown>]
    >;
  };
  let transaction: {
    simulationSession: {
      findUniqueOrThrow: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<{ count: number }>, [UpdateManyArgs]>;
    };
    simulationEvent: { update: jest.Mock<Promise<unknown>, [unknown]> };
    simulationAction: {
      findFirst: jest.Mock<Promise<unknown>, [unknown]>;
      create: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };
  let service: SimulationsService;

  function setSessionResponses(
    paused: Record<string, unknown> = {},
    active: Record<string, unknown> = {},
  ) {
    transaction.simulationSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce(resumableSession(paused))
      .mockResolvedValueOnce(refreshedSession(active));
  }

  function resume() {
    return service.resumeSession(
      'user-1',
      sessionId,
      { action: 'resume' },
      idempotencyKey,
    );
  }

  function getSessionUpdate() {
    return transaction.simulationSession.updateMany.mock.calls[0][0];
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest.fn<Promise<unknown>, [unknown]>(),
        updateMany: jest
          .fn<Promise<{ count: number }>, [UpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      simulationEvent: {
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationAction: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
    };
    prisma = {
      simulationSession: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({ id: sessionId }),
      },
      simulationAction: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
      },
      $transaction: jest
        .fn<Promise<unknown>, [(tx: unknown) => Promise<unknown>]>()
        .mockImplementation((callback) => callback(transaction)),
    };
    service = new SimulationsService(prisma as unknown as PrismaService);
    setSessionResponses();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resumes a normal timed day using exactly the saved whole seconds', async () => {
    const result = await resume();

    expect(result.session.status).toBe('ACTIVE');
    const update = getSessionUpdate();
    expect(update.data).toEqual(
      expect.objectContaining({
        status: 'ACTIVE',
        pausedAt: null,
        pausedDecisionSeconds: null,
        nextDayAt: new Date(now.getTime() + 14_000),
      }),
    );
    expect(transaction.simulationEvent.update).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).toHaveBeenCalledTimes(1);
  });

  it('resumes without starting the timer while the new-obligation popup remains unacknowledged', async () => {
    setSessionResponses(
      { pausedDecisionSeconds: null, presentationHold: 'NEW_OBLIGATION' },
      { nextDayAt: null, presentationHold: 'NEW_OBLIGATION' },
    );
    await resume();
    expect(getSessionUpdate().data.nextDayAt).toBeNull();
    expect(getSessionUpdate().data.presentationHold).toBeUndefined();
  });

  it('restores a revealed timed event decision using exactly the saved seconds', async () => {
    setSessionResponses(
      {
        pausedDecisionSeconds: 29,
        presentationHold: 'EVENT_REVEAL',
        events: [{ id: eventId }],
      },
      {
        nextDayAt: null,
        presentationHold: 'EVENT_REVEAL',
        events: [
          {
            id: eventId,
            triggerDay: 4,
            decisionExpiresAt: new Date(now.getTime() + 29_000),
            eventSnapshot: {
              title: 'Urgent repair',
              context: 'Choose an option.',
              options: [],
            },
          },
        ],
      },
    );

    await resume();

    const update = getSessionUpdate();
    expect(update.data.nextDayAt).toBeNull();
    expect(transaction.simulationEvent.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { decisionExpiresAt: new Date(now.getTime() + 29_000) },
    });
  });

  it('resumes accessibility mode without creating a timed deadline', async () => {
    setSessionResponses(
      { timedMode: false, pausedDecisionSeconds: null },
      { timedMode: false, nextDayAt: null },
    );

    await resume();

    const update = getSessionUpdate();
    expect(update.data.nextDayAt).toBeNull();
  });

  it('rejects an active session without mutating the fictional session', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      resumableSession({ status: 'ACTIVE' }),
    );

    await expect(resume()).rejects.toThrow(
      new ConflictException('SIMULATION_NOT_PAUSED'),
    );

    expect(transaction.simulationSession.updateMany).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed resume without writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.CHANGE_STATUS,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({ action: 'resume' }))
        .digest('hex'),
      responseSnapshot: {
        session: { id: sessionId, status: 'ACTIVE' },
        obligations: [],
        replayed: false,
      },
    });

    await expect(resume()).resolves.toEqual({
      session: { id: sessionId, status: 'ACTIVE' },
      obligations: [],
      replayed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
