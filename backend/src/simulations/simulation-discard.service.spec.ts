import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000100';
const idempotencyKey = '00000000-0000-4000-8000-000000000101';
const now = new Date('2026-09-18T10:00:00.000Z');

const discardableSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  ...overrides,
});

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

type ActionCreateArgs = {
  data: Record<string, unknown>;
};

describe('SimulationsService discardSession', () => {
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
      create: jest.Mock<Promise<unknown>, [ActionCreateArgs]>;
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
          .mockResolvedValue(discardableSession()),
        updateMany: jest
          .fn<Promise<{ count: number }>, [UpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      simulationAction: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
        create: jest
          .fn<Promise<unknown>, [ActionCreateArgs]>()
          .mockResolvedValue({}),
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

  it('abandons an owned active fictional session and clears live timing state', async () => {
    await expect(
      service.discardSession(
        'user-1',
        sessionId,
        { action: 'discard' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: {
        id: sessionId,
        status: 'ABANDONED',
        abandonedAt: now.toISOString(),
      },
      replayed: false,
    });

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data).toEqual(
      expect.objectContaining({
        status: 'ABANDONED',
        abandonedAt: now,
        nextDayAt: null,
        pausedAt: null,
        pausedDecisionSeconds: null,
      }),
    );
    const action = transaction.simulationAction.create.mock.calls[0][0];
    expect(action.data.actionType).toBe(SimulationActionType.DISCARD);
    expect(action.data.idempotencyKey).toBe(idempotencyKey);
  });

  it.each(['BRIEFING', 'PAUSED'])(
    'also abandons a resumable %s session',
    async (status) => {
      transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
        discardableSession({ status }),
      );

      await expect(
        service.discardSession(
          'user-1',
          sessionId,
          { action: 'discard' },
          idempotencyKey,
        ),
      ).resolves.toMatchObject({ session: { status: 'ABANDONED' } });
    },
  );

  it('rejects a completed session without mutating fictional data', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      discardableSession({ status: 'COMPLETED' }),
    );

    await expect(
      service.discardSession(
        'user-1',
        sessionId,
        { action: 'discard' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('SIMULATION_DISCARD_NOT_ALLOWED'));

    expect(transaction.simulationSession.updateMany).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed discard without writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.DISCARD,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({ action: 'discard' }))
        .digest('hex'),
      responseSnapshot: {
        session: {
          id: sessionId,
          status: 'ABANDONED',
          abandonedAt: now.toISOString(),
        },
        replayed: false,
      },
    });

    await expect(
      service.discardSession(
        'user-1',
        sessionId,
        { action: 'discard' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: {
        id: sessionId,
        status: 'ABANDONED',
        abandonedAt: now.toISOString(),
      },
      replayed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects reuse of a status-action key for a different action', async () => {
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
      service.discardSession(
        'user-1',
        sessionId,
        { action: 'discard' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('IDEMPOTENCY_KEY_REUSED'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
