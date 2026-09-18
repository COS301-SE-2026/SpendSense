import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';

type Transaction = {
  simulationSession: {
    findUniqueOrThrow: jest.Mock<Promise<unknown>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
    updateMany: jest.Mock<Promise<{ count: number }>, [SessionUpdateManyArgs]>;
  };
  simulationObligation: { updateMany: jest.Mock<Promise<unknown>, [unknown]> };
  simulationEvent: { update: jest.Mock<Promise<unknown>, [unknown]> };
  simulationScoreEntry: {
    create: jest.Mock<Promise<unknown>, [ScoreEntryCreateArgs]>;
    createMany: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

type SessionUpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

type ScoreEntryCreateArgs = {
  data: Record<string, unknown>;
};

type TransactionCallback = (transaction: Transaction) => Promise<unknown>;

const activeSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'simulation-1',
  status: 'ACTIVE',
  currentDay: 0,
  daysInMonth: 30,
  timedMode: false,
  nextDayAt: null,
  currentBalance: '4000.00',
  savingsBalance: '1000.00',
  startingBudget: '6000.00',
  savingsRetentionMultiplier: '1.20',
  score: '40.00',
  obligations: [],
  events: [],
  ...overrides,
});

describe('SimulationTransitionService', () => {
  let prisma: {
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
  let transaction: Transaction;
  let service: SimulationTransitionService;

  beforeEach(() => {
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        updateMany: jest
          .fn<Promise<{ count: number }>, [SessionUpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      simulationObligation: {
        updateMany: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({}),
      },
      simulationEvent: {
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationScoreEntry: {
        create: jest
          .fn<Promise<unknown>, [ScoreEntryCreateArgs]>()
          .mockResolvedValue({}),
        createMany: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({}),
      },
    };
    prisma = {
      $transaction: jest
        .fn<Promise<unknown>, [TransactionCallback]>()
        .mockImplementation((callback) => callback(transaction)),
    };
    service = new SimulationTransitionService(
      prisma as unknown as PrismaService,
    );
  });

  it('advances an accessibility session one day and stops for due obligations', async () => {
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(activeSession())
      .mockResolvedValueOnce(
        activeSession({
          currentDay: 1,
          obligations: [{ id: 'obligation-1', dueDay: 1, status: 'SCHEDULED' }],
        }),
      );

    await expect(service.advanceOneDay('simulation-1')).resolves.toEqual({
      currentDay: 1,
      stoppedFor: 'PAYMENT',
    });
    expect(transaction.simulationObligation.updateMany).toHaveBeenCalledTimes(
      1,
    );
  });

  it('reveals a due event and pauses normal day progression', async () => {
    transaction.simulationSession.findUniqueOrThrow
      .mockResolvedValueOnce(
        activeSession({
          timedMode: true,
          nextDayAt: new Date(0),
        }),
      )
      .mockResolvedValueOnce(
        activeSession({
          currentDay: 1,
          timedMode: true,
          nextDayAt: new Date(15_000),
          events: [{ id: 'event-1', triggerDay: 1, status: 'SCHEDULED' }],
        }),
      );

    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({
      currentDay: 1,
      stoppedFor: 'EVENT',
    });
    expect(transaction.simulationEvent.update).toHaveBeenCalledTimes(1);
  });

  it('expires a revealed timed event exactly once into an event-result hold', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        timedMode: true,
        events: [
          {
            id: 'event-1',
            status: 'REVEALED',
            decisionExpiresAt: new Date(0),
            eventSnapshot: {
              expiryOutcome: {
                id: 'delay',
                immediateCost: '0.00',
                feeOrDebt: '150.00',
                scoreDelta: '-12.00',
              },
            },
          },
        ],
      }),
    );

    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({
      currentDay: 0,
      stoppedFor: 'EVENT_RESULT',
    });
    expect(transaction.simulationEvent.update).toHaveBeenCalledTimes(1);
    expect(transaction.simulationScoreEntry.create).toHaveBeenCalledTimes(1);
  });

  it('records one fixed missed-obligation deduction for each skipped obligation', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 5,
        obligations: [
          {
            id: 'obligation-1',
            name: 'Rent',
            dueDay: 4,
            status: 'PAYABLE',
          },
        ],
      }),
    );

    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({ currentDay: 5, stoppedFor: 'NONE' });
    expect(transaction.simulationScoreEntry.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sourceId: 'obligation-1',
          pointsDelta: -20,
        }),
      ],
    });
  });

  it('finalises the fictional month at day 30 without applying real rewards', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 30,
        currentBalance: '1000.00',
        savingsBalance: '1000.00',
        obligations: [
          { status: 'PAID' },
          { status: 'MISSED' },
          { status: 'SCHEDULED' },
        ],
        events: [
          { status: 'RESOLVED' },
          { status: 'EXPIRED' },
          { status: 'SCHEDULED' },
        ],
      }),
    );

    await expect(service.advanceOneDay('simulation-1')).resolves.toEqual({
      currentDay: 30,
      stoppedFor: 'SUMMARY',
    });
    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.where).toMatchObject({
      status: 'ACTIVE',
      currentDay: { gte: 30 },
    });
    expect(update.data).toMatchObject({
      status: 'COMPLETED',
      nextDayAt: null,
      score: '51.00',
    });
    expect(update.data.completionSnapshot).toMatchObject({
      budgetBonus: '11.00',
      finalScore: '51.00',
      obligations: { total: 3, paid: 1, missed: 1, unresolved: 1 },
      events: { total: 3, resolved: 1, expired: 1, unresolved: 1 },
    });
    const scoreEntry = transaction.simulationScoreEntry.create.mock.calls[0][0];
    expect(scoreEntry.data.sourceType).toBe('FINAL_BUDGET_BONUS');
    expect(scoreEntry.data.pointsDelta).toBe('11.00');
  });
});
