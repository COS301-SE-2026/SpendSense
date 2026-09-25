import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { Prisma, SimulationActionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000050';
const eventId = '00000000-0000-4000-8000-000000000051';
const idempotencyKey = '00000000-0000-4000-8000-000000000052';
const createdAt = new Date('2026-09-17T10:00:00.000Z');

const revealedEvent = (overrides: Record<string, unknown> = {}) => ({
  id: eventId,
  status: 'REVEALED',
  decisionExpiresAt: null,
  eventSnapshot: {
    title: 'Urgent car repair',
    context: 'A repair is needed today.',
    options: [
      {
        id: 'payment_plan',
        label: 'Use a payment plan',
        immediateCost: '150.00',
        feeOrDebt: '80.00',
        scoreDelta: '4.00',
        explanation: 'The lower immediate cost creates a future repayment.',
        introducedObligation: {
          templateCode: 'SIM_OBL_CAR_REPAIR_REPAYMENT',
          name: 'Car repair repayment',
          category: 'Debt',
          amountDue: '500.00',
          dueDay: 25,
          basePoints: '35.00',
          savingsPointsFactor: '0.80',
        },
      },
    ],
  },
  ...overrides,
});

const resolutionSession = (overrides: Record<string, unknown> = {}) => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: false,
  currentDay: 4,
  currentBalance: new Prisma.Decimal('100.00'),
  savingsBalance: new Prisma.Decimal('1000.00'),
  presentationHold: 'EVENT_REVEAL',
  events: [revealedEvent()],
  ...overrides,
});

const refreshedSession = () => ({
  id: sessionId,
  status: 'ACTIVE',
  timedMode: false,
  currentDay: 4,
  daysInMonth: 30,
  nextDayAt: null,
  startingBudget: '6000.00',
  currentBalance: '0.00',
  savingsBalance: '870.00',
  score: '4.00',
  createdAt,
  updatedAt: createdAt,
  completedAt: null,
  presentationHold: 'EVENT_RESULT',
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
  scoreEntries: [
    {
      id: 'score-entry-1',
      sourceType: 'EVENT_DECISION',
      sourceId: eventId,
      simulatedDay: 4,
      pointsDelta: '4.00',
      reason: 'Event decision: Use a payment plan',
      createdAt,
    },
  ],
});

describe('SimulationsService resolveEvent', () => {
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
    simulationEvent: { update: jest.Mock<Promise<unknown>, [unknown]> };
    simulationObligation: { create: jest.Mock<Promise<unknown>, [unknown]> };
    simulationScoreEntry: { create: jest.Mock<Promise<unknown>, [unknown]> };
    simulationAction: { create: jest.Mock<Promise<unknown>, [unknown]> };
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
          .mockResolvedValueOnce(resolutionSession())
          .mockResolvedValueOnce(refreshedSession()),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationEvent: {
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationObligation: {
        create: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({ id: 'introduced-obligation-1' }),
      },
      simulationScoreEntry: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      simulationAction: {
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

  it('resolves one persisted option, debits Current then Savings, and records one result', async () => {
    const result = await service.resolveEvent(
      'user-1',
      sessionId,
      eventId,
      { optionId: 'payment_plan' },
      idempotencyKey,
    );

    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(result.event).toEqual({
      id: eventId,
      optionId: 'payment_plan',
      label: 'Use a payment plan',
      explanation: 'The lower immediate cost creates a future repayment.',
      immediateCost: '150.00',
      feeOrDebt: '80.00',
      currentUsed: '100.00',
      savingsUsed: '130.00',
      uncoveredAmount: '0.00',
      pointsAwarded: '4.00',
      introducedObligationId: 'introduced-obligation-1',
    });
    expect(result.session.pending).toEqual({ type: 'EVENT_RESULT', id: null });
    expect(transaction.simulationEvent.update).toHaveBeenCalledTimes(1);
    const createdObligation =
      transaction.simulationObligation.create.mock.calls[0]?.[0];
    expect(createdObligation).toMatchObject({
      data: {
        consequenceSnapshot: {
          basePoints: '35.00',
          savingsPointsFactor: '0.80',
          importance: 'STANDARD',
          importanceWeight: '1.00',
          baseMissPenalty: '20.00',
        },
      },
    });
    expect(transaction.simulationObligation.create).toHaveBeenCalledTimes(1);
    expect(transaction.simulationScoreEntry.create).toHaveBeenCalledTimes(1);
    expect(transaction.simulationAction.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an option not in the persisted event without mutating state', async () => {
    await expect(
      service.resolveEvent(
        'user-1',
        sessionId,
        eventId,
        { optionId: 'invented_option' },
        idempotencyKey,
      ),
    ).rejects.toThrow('SIMULATION_EVENT_OPTION_INVALID');

    expect(transaction.simulationEvent.update).not.toHaveBeenCalled();
    expect(transaction.simulationScoreEntry.create).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('rejects a timed-out event after the transition engine committed its expiry', async () => {
    transaction.simulationSession.findUniqueOrThrow.mockReset();
    transaction.simulationSession.findUniqueOrThrow.mockResolvedValue(
      resolutionSession({
        timedMode: true,
        presentationHold: 'EVENT_RESULT',
        events: [revealedEvent({ status: 'EXPIRED' })],
      }),
    );

    await expect(
      service.resolveEvent(
        'user-1',
        sessionId,
        eventId,
        { optionId: 'payment_plan' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('EVENT_DECISION_EXPIRED'));

    expect(transaction.simulationEvent.update).not.toHaveBeenCalled();
    expect(transaction.simulationAction.create).not.toHaveBeenCalled();
  });

  it('replays a committed event result without resolving transitions or writing again', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      actionType: SimulationActionType.RESOLVE_EVENT,
      payloadHash: createHash('sha256')
        .update(JSON.stringify({ eventId, optionId: 'payment_plan' }))
        .digest('hex'),
      responseSnapshot: {
        session: { id: sessionId },
        obligations: [],
        event: { id: eventId, optionId: 'payment_plan' },
        replayed: false,
      },
    });

    await expect(
      service.resolveEvent(
        'user-1',
        sessionId,
        eventId,
        { optionId: 'payment_plan' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: { id: sessionId },
      obligations: [],
      event: { id: eventId, optionId: 'payment_plan' },
      replayed: true,
    });
    expect(
      transitionService.resolveDueTransitionsInTransaction,
    ).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
