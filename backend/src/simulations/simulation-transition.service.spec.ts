import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';

type Transaction = {
  $queryRaw: jest.Mock;
  simulationObligationSchedule: { updateMany: jest.Mock };
  simulationSession: {
    findUniqueOrThrow: jest.Mock<Promise<unknown>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
    updateMany: jest.Mock<Promise<{ count: number }>, [SessionUpdateManyArgs]>;
  };
  simulationObligation: {
    updateMany: jest.Mock;
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  simulationEvent: { update: jest.Mock<Promise<unknown>, [unknown]> };
  simulationScoreEntry: {
    create: jest.Mock<Promise<unknown>, [ScoreEntryCreateArgs]>;
    createMany: jest.Mock<Promise<unknown>, [unknown]>;
  };
  userEvent: { create: jest.Mock<Promise<{ id: string }>, [unknown]> };
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
  userId: 'user-1',
  status: 'ACTIVE',
  presentationHold: 'NONE',
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
  obligationSchedules: [],
  events: [],
  ...overrides,
});

describe('SimulationTransitionService', () => {
  let prisma: {
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
  let transaction: Transaction;
  let rewardService: { grantXp: jest.Mock };
  let badgeEngineService: { evaluateSimulationBadges: jest.Mock };
  let service: SimulationTransitionService;

  beforeEach(() => {
    transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'simulation-1' }]),
      simulationObligationSchedule: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      simulationSession: {
        findUniqueOrThrow: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        updateMany: jest
          .fn<Promise<{ count: number }>, [SessionUpdateManyArgs]>()
          .mockResolvedValue({ count: 1 }),
      },
      simulationObligation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({ id: 'introduced-1' }),
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
      userEvent: {
        create: jest
          .fn<Promise<{ id: string }>, [unknown]>()
          .mockResolvedValue({ id: 'simulation-completed-event-1' }),
      },
    };
    prisma = {
      $transaction: jest
        .fn<Promise<unknown>, [TransactionCallback]>()
        .mockImplementation((callback) => callback(transaction)),
    };
    rewardService = { grantXp: jest.fn().mockResolvedValue({ xp: 15 }) };
    badgeEngineService = {
      evaluateSimulationBadges: jest
        .fn()
        .mockResolvedValue(['Month Navigator']),
    };
    service = new SimulationTransitionService(
      prisma as unknown as PrismaService,
      rewardService as never,
      badgeEngineService as never,
    );
  });

  it('advances an accessibility session through a payable due day', async () => {
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
      stoppedFor: 'NONE',
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

  it('scores a missed obligation once from its saved amount and importance', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 5,
        obligations: [
          {
            id: 'obligation-1',
            name: 'Rent',
            amountDue: '1500.00',
            dueDay: 4,
            status: 'PAYABLE',
            consequenceSnapshot: {
              baseMissPenalty: '20.00',
              importance: 'CRITICAL',
              importanceWeight: '2.00',
              amountReference: '1000.00',
              minimumCostFactor: '0.50',
              maximumCostFactor: '1.50',
            },
          },
        ],
      }),
    );
    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({
      currentDay: 5,
      stoppedFor: 'NONE',
    });
    expect(
      transaction.simulationScoreEntry.create.mock.calls[0][0].data,
    ).toMatchObject({
      sourceType: 'OBLIGATION_MISSED',
      sourceId: 'obligation-1',
      pointsDelta: '-60.00',
      calculationData: {
        amountDue: '1500.00',
        importanceWeight: '2.00',
        costFactor: '1.50',
        penalty: '60.00',
      },
    });
    transaction.simulationObligation.updateMany.mockResolvedValue({ count: 0 });
    await service.resolveDueTransitions('simulation-1');
    expect(transaction.simulationScoreEntry.create).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'keeps an unpaid bill payable throughout its due day (timed=%s)',
    async (timedMode) => {
      transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
        activeSession({
          currentDay: 4,
          timedMode,
          nextDayAt: timedMode ? new Date(Date.now() + 15_000) : null,
          obligations: [
            {
              id: 'bill-1',
              name: 'Rent',
              amountDue: '1500.00',
              dueDay: 4,
              status: 'PAYABLE',
              consequenceSnapshot: {},
            },
          ],
        }),
      );
      await expect(
        service.resolveDueTransitions('simulation-1'),
      ).resolves.toEqual({
        currentDay: 4,
        stoppedFor: 'NONE',
      });
      expect(
        transaction.simulationObligation.updateMany,
      ).not.toHaveBeenCalled();
      expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
    },
  );

  it.each(['manual', 'timed'])(
    '%s mode keeps the due day open and misses on the next boundary',
    async (mode) => {
      const timedMode = mode === 'timed';
      const obligation = {
        id: 'bill-1',
        name: 'Unaffordable bill',
        amountDue: '9000.00',
        dueDay: 1,
        status: 'PAYABLE',
        consequenceSnapshot: {},
      };
      transaction.simulationSession.findUniqueOrThrow
        .mockResolvedValueOnce(
          activeSession({
            currentDay: 1,
            timedMode,
            nextDayAt: timedMode ? new Date(0) : null,
            obligations: [obligation],
          }),
        )
        .mockResolvedValueOnce(
          activeSession({
            currentDay: 2,
            timedMode,
            nextDayAt: timedMode ? new Date(Date.now() + 15_000) : null,
            obligations: [obligation],
          }),
        )
        .mockResolvedValue(
          activeSession({
            currentDay: 2,
            timedMode,
            obligations: [{ ...obligation, status: 'MISSED' }],
          }),
        );
      const result = timedMode
        ? await service.resolveDueTransitions('simulation-1')
        : await service.advanceOneDay('simulation-1');
      expect(result).toEqual({ currentDay: 2, stoppedFor: 'NONE' });
      expect(
        transaction.simulationScoreEntry.create.mock.calls[0][0].data,
      ).toMatchObject({
        sourceType: 'OBLIGATION_MISSED',
        simulatedDay: 2,
        pointsDelta: '-20.00',
      });
    },
  );

  it('restarts a timed clock left stopped at an old payable-bill boundary', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        timedMode: true,
        currentDay: 4,
        nextDayAt: null,
        obligations: [
          {
            id: 'bill-1',
            name: 'Rent',
            amountDue: '1500.00',
            dueDay: 4,
            status: 'PAYABLE',
            consequenceSnapshot: {},
          },
        ],
      }),
    );
    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({
      currentDay: 4,
      stoppedFor: 'NONE',
    });
    const update = transaction.simulationSession.update.mock.calls[0][0] as {
      data: { nextDayAt: Date };
    };
    expect(update.data.nextDayAt).toBeInstanceOf(Date);
    expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
  });

  it('materializes a saved random bill once and exposes it on the trigger day', async () => {
    const schedule = {
      id: 'schedule-1',
      triggerDay: 3,
      status: 'SCHEDULED',
      obligationSnapshot: {
        templateCode: 'SURPRISE_BILL',
        name: 'Surprise bill',
        category: 'Other',
        amountDue: '250.00',
        dueDay: 8,
        basePoints: '12.00',
        savingsPointsFactor: '0.80',
        importance: 'STANDARD',
        importanceWeight: '1.00',
        baseMissPenalty: '20.00',
        amountReference: '1000.00',
        minimumCostFactor: '0.50',
        maximumCostFactor: '1.50',
      },
    };
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({ currentDay: 3, obligationSchedules: [schedule] }),
    );
    await service.resolveDueTransitions('simulation-1');
    expect(
      transaction.simulationObligation.create.mock.calls[0][0],
    ).toMatchObject({
      data: {
        introducedByScheduleId: 'schedule-1',
        templateCode: 'SURPRISE_BILL',
        amountDue: '250.00',
        dueDay: 8,
        status: 'SCHEDULED',
      },
    });
    transaction.simulationObligationSchedule.updateMany.mockResolvedValue({
      count: 0,
    });
    await service.resolveDueTransitions('simulation-1');
    expect(transaction.simulationObligation.create).toHaveBeenCalledTimes(1);
  });

  it('scores an in-month missed installment with its own ledger source', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 13,
        obligations: [
          {
            id: 'installment-1',
            name: 'Repair plan',
            amountDue: '500.00',
            dueDay: 12,
            status: 'PAYABLE',
            consequenceSnapshot: { kind: 'INSTALLMENT' },
          },
        ],
      }),
    );
    await service.resolveDueTransitions('simulation-1');
    expect(
      transaction.simulationScoreEntry.create.mock.calls[0][0].data,
    ).toMatchObject({
      sourceType: 'INSTALLMENT_MISSED',
      simulatedDay: 13,
      pointsDelta: '-20.00',
    });
  });

  it('ignores obligations due after the month without a miss, debit, or score effect', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 30,
        currentBalance: '1000.00',
        savingsBalance: '1000.00',
        obligations: [
          {
            id: 'installment-1',
            name: 'Repair plan',
            amountDue: '500.00',
            dueDay: 35,
            status: 'SCHEDULED',
            consequenceSnapshot: { kind: 'INSTALLMENT' },
          },
        ],
      }),
    );
    await service.advanceOneDay('simulation-1');
    expect(transaction.simulationObligation.updateMany).not.toHaveBeenCalled();
    expect(transaction.simulationScoreEntry.create).toHaveBeenCalledTimes(1);
    expect(
      transaction.simulationScoreEntry.create.mock.calls[0][0].data.sourceType,
    ).toBe('FINAL_BUDGET_BONUS');
    const completion =
      transaction.simulationSession.updateMany.mock.calls[0][0].data;
    expect(completion).not.toHaveProperty('currentBalance');
    expect(completion).not.toHaveProperty('savingsBalance');
    expect(completion).toMatchObject({
      score: '51.00',
      completionSnapshot: {
        currentBalance: '1000.00',
        savingsBalance: '1000.00',
        budgetBonus: '11.00',
        finalScore: '51.00',
        obligations: { total: 0, paid: 0, missed: 0, unresolved: 0 },
      },
    });
  });

  it('finalises the fictional month at day 30 and settles its rewards once', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({
        currentDay: 30,
        currentBalance: '1000.00',
        savingsBalance: '1000.00',
        obligations: [
          { status: 'PAID', dueDay: 3 },
          { status: 'MISSED', dueDay: 10 },
          {
            id: 'day-30-bill',
            name: 'Final bill',
            amountDue: '400.00',
            status: 'PAYABLE',
            dueDay: 30,
            consequenceSnapshot: {
              baseMissPenalty: '20.00',
              importanceWeight: '1.00',
              amountReference: '1000.00',
              minimumCostFactor: '0.50',
              maximumCostFactor: '1.50',
            },
          },
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
      score: '41.00',
    });
    expect(update.data.completionSnapshot).toMatchObject({
      budgetBonus: '11.00',
      finalScore: '41.00',
      obligations: { total: 3, paid: 1, missed: 2, unresolved: 0 },
      events: { total: 3, resolved: 1, expired: 1, unresolved: 1 },
    });
    const missedEntry =
      transaction.simulationScoreEntry.create.mock.calls[0][0];
    expect(missedEntry.data).toMatchObject({
      sourceType: 'OBLIGATION_MISSED',
      sourceId: 'day-30-bill',
      pointsDelta: '-10.00',
    });
    const bonusEntry = transaction.simulationScoreEntry.create.mock.calls[1][0];
    expect(bonusEntry.data.sourceType).toBe('FINAL_BUDGET_BONUS');
    expect(bonusEntry.data.pointsDelta).toBe('11.00');
    expect(rewardService.grantXp).toHaveBeenCalledWith(transaction, {
      userId: 'user-1',
      amount: 15,
    });
    expect(badgeEngineService.evaluateSimulationBadges).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        sourceEventId: 'simulation-completed-event-1',
      },
      transaction,
    );
  });

  it('does not settle completion rewards again after the guard is claimed', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      activeSession({ status: 'COMPLETED', currentDay: 30 }),
    );
    transaction.simulationSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.resolveDueTransitions('simulation-1'),
    ).resolves.toEqual({ currentDay: 30, stoppedFor: 'SUMMARY' });

    expect(transaction.userEvent.create).not.toHaveBeenCalled();
    expect(rewardService.grantXp).not.toHaveBeenCalled();
    expect(badgeEngineService.evaluateSimulationBadges).not.toHaveBeenCalled();
  });
});
