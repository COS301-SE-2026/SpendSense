import { ConflictException, NotFoundException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000030';
const idempotencyKey = '00000000-0000-4000-8000-000000000031';
const createdAt = new Date('2026-09-15T10:00:00.000Z');

const advanceableSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: false,
  presentationHold: 'NONE',
  obligations: [],
  events: [],
  ...overrides,
});

const refreshedSession = () => ({
  ...advanceableSession(),
  currentDay: 1,
  daysInMonth: 30,
  nextDayAt: null,
  startingBudget: '6000.00',
  currentBalance: '4200.00',
  savingsBalance: '1800.00',
  score: '0.00',
  createdAt,
  updatedAt: createdAt,
  completedAt: null,
  scenarioSnapshot: {
    allocationOptions: [],
    customAllocation: {
      enabled: true,
      minCurrentAmount: '0.00',
      maxCurrentAmount: '6000.00',
      increment: '50.00',
    },
  },
  scoreEntries: [],
});

type ActionCreateArgs = {
  data: {
    sessionId: string;
    actionType: SimulationActionType;
    idempotencyKey: string;
    payloadHash: string;
    responseSnapshot: unknown;
  };
};

describe('SimulationsService advanceSession', () => {
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
    };
    simulationAction: {
      create: jest.Mock<Promise<unknown>, [ActionCreateArgs]>;
    };
  };
  let transitionService: { advanceOneDayInTransaction: jest.Mock };
  let service: SimulationsService;

  beforeEach(() => {
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValueOnce(advanceableSession())
          .mockResolvedValueOnce(refreshedSession()),
      },
      simulationAction: {
        create: jest
          .fn<Promise<unknown>, [ActionCreateArgs]>()
          .mockResolvedValue({}),
      },
    };
    prisma = {
      simulationSession: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(advanceableSession()),
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
    transitionService = { advanceOneDayInTransaction: jest.fn() };
    service = new SimulationsService(
      prisma as unknown as PrismaService,
      transitionService as unknown as SimulationTransitionService,
    );
  });

  it('advances one accessibility-mode boundary and snapshots the refreshed safe state', async () => {
    const result = await service.advanceSession(
      'user-1',
      sessionId,
      idempotencyKey,
    );

    expect(transitionService.advanceOneDayInTransaction).toHaveBeenCalledTimes(
      1,
    );
    expect(result.replayed).toBe(false);
    expect(result.session.currentDay).toBe(1);
    expect(result.allowedActions).toEqual(['ADVANCE_DAY']);
    const action = transaction.simulationAction.create.mock.calls[0][0];
    expect(action.data.sessionId).toBe(sessionId);
    expect(action.data.actionType).toBe(SimulationActionType.ADVANCE_DAY);
    expect(action.data.idempotencyKey).toBe(idempotencyKey);
    expect(action.data.responseSnapshot).toEqual(
      expect.objectContaining({ replayed: false }),
    );
  });

  it('replays a committed advance without invoking the transition engine', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.ADVANCE_DAY,
      payloadHash:
        '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
      responseSnapshot: {
        session: { id: sessionId },
        obligations: [],
        replayed: false,
      },
    });

    await expect(
      service.advanceSession('user-1', sessionId, idempotencyKey),
    ).resolves.toEqual({
      session: { id: sessionId },
      obligations: [],
      replayed: true,
    });
    expect(transitionService.advanceOneDayInTransaction).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects timed sessions and unresolved event holds before mutation', async () => {
    prisma.simulationSession.findFirst.mockResolvedValue(
      advanceableSession({ timedMode: true }),
    );
    await expect(
      service.advanceSession('user-1', sessionId, idempotencyKey),
    ).rejects.toThrow(new ConflictException('TIMED_MODE_ACTIVE'));

    prisma.simulationSession.findFirst.mockResolvedValue(
      advanceableSession({ presentationHold: 'EVENT_REVEAL' }),
    );
    await expect(
      service.advanceSession('user-1', sessionId, idempotencyKey),
    ).rejects.toThrow(new ConflictException('SIMULATION_ACTION_PENDING'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not reveal whether a foreign or missing session exists', async () => {
    prisma.simulationSession.findFirst.mockResolvedValue(null);

    await expect(
      service.advanceSession('user-1', sessionId, idempotencyKey),
    ).rejects.toThrow(new NotFoundException('SIMULATION_NOT_FOUND'));
    expect(prisma.simulationAction.findFirst).not.toHaveBeenCalled();
  });
});
