import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000040';
const obligationId = '00000000-0000-4000-8000-000000000041';
const idempotencyKey = '00000000-0000-4000-8000-000000000042';
const createdAt = new Date('2026-09-15T11:00:00.000Z');

const payableSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  currentDay: 3,
  daysInMonth: 30,
  currentBalance: '1000.00',
  savingsBalance: '1000.00',
  presentationHold: 'NONE',
  obligations: [
    {
      id: obligationId,
      name: 'Rent',
      amountDue: '1200.00',
      dueDay: 3,
      status: 'PAYABLE',
      consequenceSnapshot: {
        basePoints: '60.00',
        savingsPointsFactor: '0.80',
        importance: 'CRITICAL',
        importanceWeight: '2.50',
        amountReference: '1000.00',
        minimumCostFactor: '0.50',
        maximumCostFactor: '1.50',
      },
    },
  ],
  ...overrides,
});

const refreshedSession = () => ({
  ...payableSession({ currentBalance: '0.00', savingsBalance: '800.00' }),
  timedMode: false,
  daysInMonth: 30,
  nextDayAt: null,
  startingBudget: '6000.00',
  score: '144.00',
  createdAt,
  updatedAt: createdAt,
  completedAt: null,
  presentationHold: 'PAYMENT_RESULT',
  scenarioSnapshot: {
    allocationOptions: [],
    customAllocation: {
      enabled: true,
      minCurrentAmount: '0.00',
      maxCurrentAmount: '6000.00',
      increment: '50.00',
    },
  },
  obligations: [
    {
      id: obligationId,
      templateCode: 'SIM_OBL_RENT',
      name: 'Rent',
      category: 'Housing',
      amountDue: '1200.00',
      dueDay: 3,
      status: 'PAID',
      paidAt: createdAt,
      currentUsed: '1000.00',
      savingsUsed: '200.00',
      pointsAwarded: '144.00',
    },
  ],
  events: [],
  scoreEntries: [
    {
      id: 'score-entry-1',
      sourceType: 'OBLIGATION_PAYMENT',
      sourceId: obligationId,
      simulatedDay: 3,
      pointsDelta: '144.00',
      reason: 'Paid using Savings: Rent',
      createdAt,
    },
  ],
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

type ObligationUpdateArgs = {
  where: { id: string };
  data: { status: string; [key: string]: unknown };
};

describe('SimulationsService payObligation', () => {
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
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
    simulationObligation: {
      update: jest.Mock<Promise<unknown>, [ObligationUpdateArgs]>;
    };
    simulationScoreEntry: { create: jest.Mock<Promise<unknown>, [unknown]> };
    simulationAction: {
      create: jest.Mock<Promise<unknown>, [ActionCreateArgs]>;
    };
  };
  let transitionService: {
    resolveDueTransitionsInTransaction: jest.Mock;
  };
  let service: SimulationsService;

  beforeEach(() => {
    transaction = {
      simulationSession: {
        findUniqueOrThrow: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValueOnce(payableSession())
          .mockResolvedValueOnce(refreshedSession()),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationObligation: {
        update: jest
          .fn<Promise<unknown>, [ObligationUpdateArgs]>()
          .mockResolvedValue({}),
      },
      simulationScoreEntry: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
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

  it('does not allow payment of an obligation due outside this month', async () => {
    transaction.simulationSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValue(
        payableSession({
          obligations: [
            {
              ...payableSession().obligations[0],
              dueDay: 35,
              consequenceSnapshot: { kind: 'INSTALLMENT' },
            },
          ],
        }),
      );
    await expect(
      service.payObligation('user-1', sessionId, obligationId, idempotencyKey),
    ).rejects.toThrow(
      new ConflictException('SIMULATION_OBLIGATION_NOT_PAYABLE'),
    );
    expect(transaction.simulationObligation.update).not.toHaveBeenCalled();
    expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
  });

  it('pays the full fictional amount Current-first, then Savings, and records one result', async () => {
    const result = await service.payObligation(
      'user-1',
      sessionId,
      obligationId,
      idempotencyKey,
    );

    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(result.payment).toEqual({
      obligationId,
      timing: 'ON_TIME',
      amountDue: '1200.00',
      currentUsed: '1000.00',
      savingsUsed: '200.00',
      basePoints: '60.00',
      savingsPointsFactor: '0.80',
      amountReference: '1000.00',
      costFactor: '1.20',
      importance: 'CRITICAL',
      importanceWeight: '2.50',
      effectiveWeight: '3.00',
      accountFactor: '0.80',
      scoringVersion: 'WEIGHTED_V1',
      pointsAwarded: '144.00',
    });
    expect(result.session.pending).toEqual({
      type: 'PAYMENT_RESULT',
      id: null,
    });
    const obligationUpdate =
      transaction.simulationObligation.update.mock.calls[0][0];
    expect(obligationUpdate.where.id).toBe(obligationId);
    expect(obligationUpdate.data.status).toBe('PAID');
    expect(transaction.simulationScoreEntry.create).toHaveBeenCalledTimes(1);
    expect(
      transaction.simulationScoreEntry.create.mock.calls[0]?.[0],
    ).toMatchObject({
      data: {
        pointsDelta: '144.00',
        calculationData: {
          timing: 'ON_TIME',
          amountReference: '1000.00',
          costFactor: '1.20',
          importance: 'CRITICAL',
          importanceWeight: '2.50',
          effectiveWeight: '3.00',
          accountFactor: '0.80',
          scoringVersion: 'WEIGHTED_V1',
        },
      },
    });
    const action = transaction.simulationAction.create.mock.calls[0][0];
    expect(action.data.actionType).toBe(SimulationActionType.PAY_OBLIGATION);
    expect(action.data.responseSnapshot).toEqual(
      expect.objectContaining({ replayed: false }),
    );
  });

  it('allows an early full payment and identifies it without an extra bonus', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValueOnce(
      payableSession({
        currentDay: 2,
        obligations: [
          {
            id: obligationId,
            name: 'Rent',
            amountDue: '1200.00',
            dueDay: 9,
            status: 'SCHEDULED',
            consequenceSnapshot: {
              basePoints: '60.00',
              savingsPointsFactor: '0.80',
              importance: 'CRITICAL',
              importanceWeight: '2.50',
              amountReference: '1000.00',
              minimumCostFactor: '0.50',
              maximumCostFactor: '1.50',
            },
          },
        ],
      }),
    );
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValueOnce(
      refreshedSession(),
    );

    const result = await service.payObligation(
      'user-1',
      sessionId,
      obligationId,
      idempotencyKey,
    );

    expect(result.payment.timing).toBe('EARLY');
    expect(result.payment.pointsAwarded).toBe('144.00');
    expect(
      transaction.simulationObligation.update.mock.calls[0]?.[0].data.status,
    ).toBe('PAID');
    expect(
      transaction.simulationScoreEntry.create.mock.calls[0]?.[0],
    ).toMatchObject({
      data: { reason: 'Paid early: Rent' },
    });
  });

  it('keeps the legacy score formula for obligations from older snapshots', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValueOnce(
      payableSession({
        obligations: [
          {
            id: obligationId,
            name: 'Rent',
            amountDue: '1200.00',
            dueDay: 3,
            status: 'PAYABLE',
            consequenceSnapshot: {
              basePoints: '60.00',
              savingsPointsFactor: '0.80',
            },
          },
        ],
      }),
    );
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValueOnce(
      refreshedSession(),
    );

    const result = await service.payObligation(
      'user-1',
      sessionId,
      obligationId,
      idempotencyKey,
    );

    expect(result.payment.scoringVersion).toBe('LEGACY');
    expect(result.payment.pointsAwarded).toBe('48.00');
  });

  it('rejects a scheduled obligation after its due day', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      payableSession({
        currentDay: 4,
        obligations: [
          {
            id: obligationId,
            name: 'Rent',
            amountDue: '1200.00',
            dueDay: 3,
            status: 'SCHEDULED',
            consequenceSnapshot: {
              basePoints: '60.00',
              savingsPointsFactor: '0.80',
            },
          },
        ],
      }),
    );

    await expect(
      service.payObligation('user-1', sessionId, obligationId, idempotencyKey),
    ).rejects.toThrow(
      new ConflictException('SIMULATION_OBLIGATION_NOT_PAYABLE'),
    );
    expect(transaction.simulationObligation.update).not.toHaveBeenCalled();
    expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
  });

  it('rejects insufficient fictional funds without a payment, score entry, or action', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      payableSession({ currentBalance: '500.00', savingsBalance: '200.00' }),
    );

    await expect(
      service.payObligation('user-1', sessionId, obligationId, idempotencyKey),
    ).rejects.toThrow(new ConflictException('INSUFFICIENT_SIMULATION_FUNDS'));
    expect(transaction.simulationObligation.update).not.toHaveBeenCalled();
    expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed payment without resolving transitions or writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.PAY_OBLIGATION,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({ obligationId }))
        .digest('hex'),
      responseSnapshot: {
        session: { id: sessionId },
        obligations: [],
        payment: { obligationId },
        replayed: false,
      },
    });

    await expect(
      service.payObligation('user-1', sessionId, obligationId, idempotencyKey),
    ).resolves.toEqual({
      session: { id: sessionId },
      obligations: [],
      payment: { obligationId },
      replayed: true,
    });
    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a payment outside the matching payable-obligation hold', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      payableSession({ presentationHold: 'EVENT_REVEAL' }),
    );

    await expect(
      service.payObligation('user-1', sessionId, obligationId, idempotencyKey),
    ).rejects.toThrow(new ConflictException('SIMULATION_ACTION_PENDING'));
    expect(transaction.simulationObligation.update).not.toHaveBeenCalled();
  });
});
