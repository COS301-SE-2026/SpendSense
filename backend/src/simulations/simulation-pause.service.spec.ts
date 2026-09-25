import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';
import { SimulationsService } from './simulations.service';
import { simulationStatusSession } from './simulation-status.fixture';

const sessionId = '00000000-0000-4000-8000-000000000070';
const eventId = '00000000-0000-4000-8000-000000000071';
const idempotencyKey = '00000000-0000-4000-8000-000000000072';
const now = new Date('2026-09-17T15:00:00.000Z');

const pauseableSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: true,
  nextDayAt: new Date(now.getTime() + 14_900),
  presentationHold: 'NONE',
  events: [],
  ...overrides,
});

const refreshedSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  ...simulationStatusSession(now, 'PAUSED', null, overrides),
});

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

describe('SimulationsService pauseSession', () => {
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
  let transitionService: {
    resolveDueTransitionsInTransaction: jest.Mock;
  };
  let service: SimulationsService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValueOnce(pauseableSession())
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
    transitionService = { resolveDueTransitionsInTransaction: jest.fn() };
    service = new SimulationsService(
      prisma as unknown as PrismaService,
      transitionService as unknown as SimulationTransitionService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pauses a normal timed day and preserves only whole remaining seconds', async () => {
    const result = await service.pauseSession(
      'user-1',
      sessionId,
      { action: 'pause' },
      idempotencyKey,
    );

    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(result.session.status).toBe('PAUSED');
    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data).toEqual(
      expect.objectContaining({
        status: 'PAUSED',
        nextDayAt: null,
        pausedDecisionSeconds: 14,
      }),
    );
    expect(transaction.simulationEvent.update).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).toHaveBeenCalledTimes(1);
  });

  it('pauses a revealed timed event and clears its live decision deadline', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        pauseableSession({
          nextDayAt: null,
          presentationHold: 'EVENT_REVEAL',
          events: [
            {
              id: eventId,
              decisionExpiresAt: new Date(now.getTime() + 29_900),
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        refreshedSession({
          presentationHold: 'EVENT_REVEAL',
          events: [
            {
              id: eventId,
              triggerDay: 4,
              decisionExpiresAt: null,
              eventSnapshot: {
                title: 'Urgent repair',
                context: 'Choose an option.',
                options: [
                  {
                    id: 'pay_now',
                    label: 'Pay now',
                    immediateCost: '100.00',
                    feeOrDebt: '0.00',
                  },
                ],
              },
            },
          ],
        }),
      );

    await service.pauseSession(
      'user-1',
      sessionId,
      { action: 'pause' },
      idempotencyKey,
    );

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.pausedDecisionSeconds).toBe(29);
    expect(transaction.simulationEvent.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { decisionExpiresAt: null },
    });
  });

  it('pauses accessibility mode without a saved deadline', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        pauseableSession({ timedMode: false, nextDayAt: null }),
      )
      .mockResolvedValueOnce(refreshedSession({ timedMode: false }));

    await service.pauseSession(
      'user-1',
      sessionId,
      { action: 'pause' },
      idempotencyKey,
    );

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.pausedDecisionSeconds).toBeNull();
  });

  it('rejects a payment result hold without changing the fictional session', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      pauseableSession({ presentationHold: 'PAYMENT_RESULT' }),
    );

    await expect(
      service.pauseSession(
        'user-1',
        sessionId,
        { action: 'pause' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('SIMULATION_PAUSE_NOT_ALLOWED'));

    expect(transaction.simulationSession.updateMany).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed pause without resolving transitions or writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.CHANGE_STATUS,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({ action: 'pause' }))
        .digest('hex'),
      responseSnapshot: {
        session: { id: sessionId, status: 'PAUSED' },
        obligations: [],
        replayed: false,
      },
    });

    await expect(
      service.pauseSession(
        'user-1',
        sessionId,
        { action: 'pause' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: { id: sessionId, status: 'PAUSED' },
      obligations: [],
      replayed: true,
    });
    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
