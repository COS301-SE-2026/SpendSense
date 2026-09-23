import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000060';
const idempotencyKey = '00000000-0000-4000-8000-000000000061';
const createdAt = new Date('2026-09-17T14:00:00.000Z');

const resultSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: true,
  presentationHold: 'PAYMENT_RESULT',
  ...overrides,
});

const refreshedSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: true,
  currentDay: 4,
  daysInMonth: 30,
  nextDayAt: new Date('2026-09-17T14:00:15.000Z'),
  startingBudget: '6000.00',
  currentBalance: '1000.00',
  savingsBalance: '1000.00',
  score: '48.00',
  createdAt,
  updatedAt: createdAt,
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

describe('SimulationsService continueSession', () => {
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
    simulationAction: {
      findFirst: jest.Mock<Promise<unknown>, [unknown]>;
      create: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };
  let service: SimulationsService;

  beforeEach(() => {
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValueOnce(resultSession())
          .mockResolvedValueOnce(refreshedSession()),
        updateMany: jest
          .fn<Promise<{ count: number }>, [UpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
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

  it('clears a payment result and starts one new timed day without changing balances or score', async () => {
    const result = await service.continueSession(
      'user-1',
      sessionId,
      idempotencyKey,
    );

    expect(result.replayed).toBe(false);
    expect(result.session.pending).toEqual({ type: 'NONE', id: null });
    expect(result.allowedActions).toEqual([]);
    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.presentationHold).toBe('NONE');
    expect(update.data.nextDayAt).toBeInstanceOf(Date);
    expect(update.data).not.toHaveProperty('currentBalance');
    expect(update.data).not.toHaveProperty('savingsBalance');
    expect(update.data).not.toHaveProperty('score');
    expect(transaction.simulationAction.create).toHaveBeenCalledTimes(1);
  });

  it('clears an event result without starting a timer in accessibility mode', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        resultSession({ timedMode: false, presentationHold: 'EVENT_RESULT' }),
      )
      .mockResolvedValueOnce(
        refreshedSession({ timedMode: false, nextDayAt: null }),
      );

    await service.continueSession('user-1', sessionId, idempotencyKey);

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.nextDayAt).toBeNull();
  });

  it('rejects continuation outside a payment or event result without mutation', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      resultSession({ presentationHold: 'NONE' }),
    );

    await expect(
      service.continueSession('user-1', sessionId, idempotencyKey),
    ).rejects.toThrow(new ConflictException('SIMULATION_CONTINUE_NOT_ALLOWED'));

    expect(transaction.simulationSession.updateMany).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed continuation without writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.CONTINUE,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({}))
        .digest('hex'),
      responseSnapshot: {
        session: { id: sessionId },
        obligations: [],
        replayed: false,
      },
    });

    await expect(
      service.continueSession('user-1', sessionId, idempotencyKey),
    ).resolves.toEqual({
      session: { id: sessionId },
      obligations: [],
      replayed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
