import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationsService } from './simulations.service';

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
  status: 'ACTIVE',
  timedMode: true,
  currentDay: 4,
  daysInMonth: 30,
  nextDayAt: new Date(now.getTime() + 14_000),
  startingBudget: '6000.00',
  currentBalance: '1000.00',
  savingsBalance: '1000.00',
  score: '48.00',
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  presentationHold: 'NONE',
  scenarioSnapshot: {
    allocationOptions: [],
    customAllocation: {
      enabled: true,
      minCurrentAmount: '0.00',
      maxCurrentAmount: '6000.00',
      increment: '50.00',
    },
  },
  obligations: [],
  events: [],
  scoreEntries: [],
  ...overrides,
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

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValueOnce(resumableSession())
          .mockResolvedValueOnce(refreshedSession()),
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resumes a normal timed day using exactly the saved whole seconds', async () => {
    const result = await service.resumeSession(
      'user-1',
      sessionId,
      { action: 'resume' },
      idempotencyKey,
    );

    expect(result.session.status).toBe('ACTIVE');
    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
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

  it('restores a revealed timed event decision using exactly the saved seconds', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        resumableSession({
          pausedDecisionSeconds: 29,
          presentationHold: 'EVENT_REVEAL',
          events: [{ id: eventId }],
        }),
      )
      .mockResolvedValueOnce(
        refreshedSession({
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
        }),
      );

    await service.resumeSession(
      'user-1',
      sessionId,
      { action: 'resume' },
      idempotencyKey,
    );

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.nextDayAt).toBeNull();
    expect(transaction.simulationEvent.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { decisionExpiresAt: new Date(now.getTime() + 29_000) },
    });
  });

  it('resumes accessibility mode without creating a timed deadline', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        resumableSession({ timedMode: false, pausedDecisionSeconds: null }),
      )
      .mockResolvedValueOnce(
        refreshedSession({ timedMode: false, nextDayAt: null }),
      );

    await service.resumeSession(
      'user-1',
      sessionId,
      { action: 'resume' },
      idempotencyKey,
    );

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.nextDayAt).toBeNull();
  });

  it('rejects an active session without mutating the fictional session', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      resumableSession({ status: 'ACTIVE' }),
    );

    await expect(
      service.resumeSession(
        'user-1',
        sessionId,
        { action: 'resume' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('SIMULATION_NOT_PAUSED'));

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

    await expect(
      service.resumeSession(
        'user-1',
        sessionId,
        { action: 'resume' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: { id: sessionId, status: 'ACTIVE' },
      obligations: [],
      replayed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
