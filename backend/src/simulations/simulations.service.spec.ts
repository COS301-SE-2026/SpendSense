import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SimulationActionType } from '@prisma/client';
import {
  simulationEventTemplates,
  simulationObligationTemplates,
} from '../../prisma/seed/simulation-catalogue';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  CatalogueEvent,
  CatalogueObligation,
} from './simulation-scenario-builder';
import { SimulationsService } from './simulations.service';

const idempotencyKey = '00000000-0000-4000-8000-000000000001';
const createdAt = new Date('2026-09-14T12:00:00.000Z');

const activeObligationTemplates: CatalogueObligation[] =
  simulationObligationTemplates.map((template) => ({
    ...template,
    isActive: true,
  }));
const activeEventTemplates: CatalogueEvent[] = simulationEventTemplates.map(
  (template) => ({ ...template, isActive: true }),
);

type SessionCreateArgs = {
  data: {
    status: string;
    timedMode: boolean;
    startingBudget: string;
    currentBalance: string;
    savingsBalance: string;
    scenarioSnapshot: { obligations: unknown[]; events: unknown[] };
    obligations: { create: Array<{ templateCode: string }> };
    events: { create: Array<{ templateCode: string }> };
  };
};

type SessionRecord = {
  id: string;
  status: string;
  timedMode: boolean;
  currentDay: number;
  daysInMonth: number;
  nextDayAt: null;
  startingBudget: string;
  currentBalance: string;
  savingsBalance: string;
  score: string;
  createdAt: Date;
  completedAt: null;
  obligations: Array<{
    id: string;
    templateCode: string;
    name: string;
    category: string;
    amountDue: string;
    dueDay: number;
    status: string;
  }>;
  events: Array<{ id: string }>;
};

type CreationAction = { payloadHash: string; responseSnapshot: unknown };
type ActionCreateArgs = {
  data: {
    sessionId: string;
    actionType: SimulationActionType;
    idempotencyKey: string;
    responseSnapshot: { id: string };
  };
};
type SimulationTransaction = {
  simulationSession: {
    create: jest.Mock<Promise<SessionRecord>, [SessionCreateArgs]>;
  };
  simulationAction: {
    create: jest.Mock<Promise<{ id: string }>, [ActionCreateArgs]>;
  };
};
type TransactionCallback = (
  transaction: SimulationTransaction,
) => Promise<unknown>;

function persistedSession(data?: SessionCreateArgs['data']): SessionRecord {
  const selectedObligations = data?.obligations.create ?? [];
  const selectedEvents = data?.events.create ?? [];
  return {
    id: 'simulation-1',
    status: data?.status ?? 'BRIEFING',
    timedMode: data?.timedMode ?? true,
    currentDay: 0,
    daysInMonth: 30,
    nextDayAt: null,
    startingBudget: data?.startingBudget ?? '4000.00',
    currentBalance: data?.currentBalance ?? '4000.00',
    savingsBalance: data?.savingsBalance ?? '0.00',
    score: '0.00',
    createdAt,
    completedAt: null,
    obligations: selectedObligations.map((selected, index) => {
      const template = activeObligationTemplates.find(
        (candidate) => candidate.code === selected.templateCode,
      );
      if (!template) {
        throw new Error(
          'Expected the selected obligation to come from the catalogue',
        );
      }
      return {
        id: `obligation-${index + 1}`,
        templateCode: template.code,
        name: template.name,
        category: template.category,
        amountDue: String(template.amountDue),
        dueDay: template.dueDay,
        status: 'SCHEDULED',
      };
    }),
    events: selectedEvents.map((_, index) => ({ id: `event-${index + 1}` })),
  };
}

function createTransaction(): SimulationTransaction {
  return {
    simulationSession: {
      create: jest
        .fn<Promise<SessionRecord>, [SessionCreateArgs]>()
        .mockImplementation(({ data }) =>
          Promise.resolve(persistedSession(data)),
        ),
    },
    simulationAction: {
      create: jest
        .fn<Promise<{ id: string }>, [ActionCreateArgs]>()
        .mockResolvedValue({ id: 'action-1' }),
    },
  };
}

describe('SimulationsService', () => {
  let prisma: {
    simulationAction: {
      findFirst: jest.Mock<Promise<CreationAction | null>, [unknown]>;
    };
    simulationSession: {
      findFirst: jest.Mock<Promise<unknown>, [unknown]>;
    };
    simulationObligationTemplate: {
      findMany: jest.Mock<Promise<CatalogueObligation[]>, [unknown]>;
    };
    simulationEventTemplate: {
      findMany: jest.Mock<Promise<CatalogueEvent[]>, [unknown]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
  let transaction: SimulationTransaction;
  let service: SimulationsService;

  beforeEach(() => {
    transaction = createTransaction();
    prisma = {
      simulationAction: {
        findFirst: jest
          .fn<Promise<CreationAction | null>, [unknown]>()
          .mockResolvedValue(null),
      },
      simulationSession: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
      },
      simulationObligationTemplate: {
        findMany: jest
          .fn<Promise<CatalogueObligation[]>, [unknown]>()
          .mockResolvedValue(activeObligationTemplates),
      },
      simulationEventTemplate: {
        findMany: jest
          .fn<Promise<CatalogueEvent[]>, [unknown]>()
          .mockResolvedValue(activeEventTemplates),
      },
      $transaction: jest
        .fn<Promise<unknown>, [TransactionCallback]>()
        .mockImplementation((callback) => callback(transaction)),
    };
    service = new SimulationsService(prisma as unknown as PrismaService);
  });

  it('persists a complete fictional briefing, selected snapshots, and creation audit action', async () => {
    const result = await service.createBriefing(
      'user-1',
      { timedMode: true },
      idempotencyKey,
    );

    expect(result.id).toBe('simulation-1');
    expect(result.status).toBe('BRIEFING');
    expect(result.timedMode).toBe(true);
    expect(result.currentBalance).toBe(result.startingBudget);
    expect(result.savingsBalance).toBe('0.00');
    expect(result.replayed).toBe(false);
    expect(result.briefing.surpriseEventCount).toBeGreaterThanOrEqual(2);
    expect(result.briefing.surpriseEventCount).toBeLessThanOrEqual(4);
    expect(result.briefing.allocationOptions[0].id).toBe(
      'current_80_savings_20',
    );
    expect(result.briefing.obligations.length).toBeGreaterThanOrEqual(5);

    const sessionCreate = transaction.simulationSession.create.mock.calls[0][0];
    expect(Array.isArray(sessionCreate.data.scenarioSnapshot.obligations)).toBe(
      true,
    );
    expect(Array.isArray(sessionCreate.data.scenarioSnapshot.events)).toBe(
      true,
    );
    expect(sessionCreate.data.obligations.create).toHaveLength(
      result.briefing.obligations.length,
    );
    expect(sessionCreate.data.events.create).toHaveLength(
      result.briefing.surpriseEventCount,
    );
    const actionCreate = transaction.simulationAction.create.mock.calls[0][0];
    expect(actionCreate.data.sessionId).toBe('simulation-1');
    expect(actionCreate.data.actionType).toBe(
      SimulationActionType.CREATE_SIMULATION,
    );
    expect(actionCreate.data.idempotencyKey).toBe(idempotencyKey);
    expect(actionCreate.data.responseSnapshot.id).toBe('simulation-1');
  });

  it('replays the committed response for the same idempotency key and payload', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      payloadHash:
        'b420eb9646f9a1c2945ce764934fedea3ed05bd2b45e47dde1421d39f5136549',
      responseSnapshot: { id: 'simulation-1', briefing: {}, replayed: false },
    });

    await expect(
      service.createBriefing('user-1', { timedMode: true }, idempotencyKey),
    ).resolves.toEqual({ id: 'simulation-1', briefing: {}, replayed: true });
    expect(prisma.simulationSession.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a reused idempotency key with different request data', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      payloadHash:
        'b420eb9646f9a1c2945ce764934fedea3ed05bd2b45e47dde1421d39f5136549',
      responseSnapshot: { id: 'simulation-1', briefing: {}, replayed: false },
    });

    await expect(
      service.createBriefing('user-1', { timedMode: false }, idempotencyKey),
    ).rejects.toThrow(new ConflictException('IDEMPOTENCY_KEY_REUSED'));
  });

  it('rejects a distinct request when the player already has a resumable session', async () => {
    prisma.simulationSession.findFirst.mockResolvedValue({
      id: 'simulation-1',
    });

    await expect(
      service.createBriefing(
        'user-1',
        { timedMode: false },
        '00000000-0000-4000-8000-000000000002',
      ),
    ).rejects.toThrow(new ConflictException('ACTIVE_SESSION_EXISTS'));
    expect(prisma.simulationObligationTemplate.findMany).not.toHaveBeenCalled();
  });

  it('maps an insufficient active catalogue to a safe service-unavailable response', async () => {
    prisma.simulationObligationTemplate.findMany.mockResolvedValue(
      activeObligationTemplates.slice(0, 4),
    );

    await expect(
      service.createBriefing('user-1', { timedMode: false }, idempotencyKey),
    ).rejects.toThrow(
      new ServiceUnavailableException('SIMULATION_CATALOGUE_UNAVAILABLE'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reconciles a partial-index race as an active-session conflict', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2002' });
    prisma.simulationAction.findFirst.mockResolvedValue(null);
    prisma.simulationSession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'simulation-created-by-racer' });

    await expect(
      service.createBriefing('user-1', { timedMode: true }, idempotencyKey),
    ).rejects.toThrow(new ConflictException('ACTIVE_SESSION_EXISTS'));
  });

  it('requires a UUID idempotency key before it reads catalogue data', async () => {
    await expect(
      service.createBriefing('user-1', { timedMode: true }, 'not-a-uuid'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.simulationAction.findFirst).not.toHaveBeenCalled();
  });

  it('returns only safe summaries for a resumable session and latest completed session', async () => {
    prisma.simulationSession.findFirst
      .mockResolvedValueOnce({
        id: 'active-session',
        status: 'PAUSED',
        timedMode: true,
        currentDay: 7,
        daysInMonth: 30,
        nextDayAt: null,
        startingBudget: '6000.00',
        currentBalance: '2200.00',
        savingsBalance: '1500.00',
        score: '140.50',
        createdAt,
        updatedAt: new Date('2026-09-14T12:05:00.000Z'),
        completedAt: null,
        scenarioSnapshot: { shouldNotBeReturned: true },
      })
      .mockResolvedValueOnce({
        id: 'completed-session',
        status: 'COMPLETED',
        timedMode: false,
        currentDay: 30,
        daysInMonth: 30,
        nextDayAt: null,
        startingBudget: '5000.00',
        currentBalance: '900.00',
        savingsBalance: '1100.00',
        score: '311.25',
        createdAt,
        updatedAt: new Date('2026-09-13T12:05:00.000Z'),
        completedAt: new Date('2026-09-13T12:00:00.000Z'),
        scenarioSnapshot: { shouldNotBeReturned: true },
      });

    const result = await service.getActiveSession('user-1');

    expect(result).toEqual({
      active: {
        id: 'active-session',
        status: 'PAUSED',
        timedMode: true,
        currentDay: 7,
        daysInMonth: 30,
        nextDayAt: null,
        startingBudget: '6000.00',
        currentBalance: '2200.00',
        savingsBalance: '1500.00',
        score: '140.50',
        createdAt: '2026-09-14T12:00:00.000Z',
        updatedAt: '2026-09-14T12:05:00.000Z',
        completedAt: null,
      },
      latestCompleted: {
        id: 'completed-session',
        status: 'COMPLETED',
        timedMode: false,
        currentDay: 30,
        daysInMonth: 30,
        nextDayAt: null,
        startingBudget: '5000.00',
        currentBalance: '900.00',
        savingsBalance: '1100.00',
        score: '311.25',
        createdAt: '2026-09-14T12:00:00.000Z',
        updatedAt: '2026-09-13T12:05:00.000Z',
        completedAt: '2026-09-13T12:00:00.000Z',
      },
    });
    expect(prisma.simulationSession.findFirst).toHaveBeenCalledTimes(2);
  });

  it('returns null summaries when the player has no resumable or completed simulation', async () => {
    await expect(service.getActiveSession('user-1')).resolves.toEqual({
      active: null,
      latestCompleted: null,
    });
  });

  it('returns safe owned session state without future event or hidden option-score content', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000010';
    prisma.simulationSession.findFirst.mockResolvedValue({
      id: sessionId,
      status: 'ACTIVE',
      timedMode: true,
      currentDay: 7,
      daysInMonth: 30,
      nextDayAt: new Date('2026-09-14T12:00:15.000Z'),
      startingBudget: '6000.00',
      currentBalance: '2200.00',
      savingsBalance: '1500.00',
      score: '140.50',
      createdAt,
      updatedAt: new Date('2026-09-14T12:05:00.000Z'),
      completedAt: null,
      presentationHold: 'EVENT_REVEAL',
      scenarioSnapshot: {
        allocationOptions: [
          {
            id: 'current_80_savings_20',
            label: '80% Current / 20% Savings',
            currentAmount: '4800.00',
            savingsAmount: '1200.00',
          },
        ],
        customAllocation: {
          enabled: true,
          minCurrentAmount: '0.00',
          maxCurrentAmount: '6000.00',
          increment: '50.00',
        },
        events: [{ title: 'Future event that must stay hidden' }],
      },
      obligations: [
        {
          id: 'obligation-1',
          templateCode: 'SIM_OBL_RENT',
          name: 'Rent',
          category: 'Housing',
          amountDue: '1800.00',
          dueDay: 3,
          status: 'PAID',
          paidAt: new Date('2026-09-14T12:00:00.000Z'),
          currentUsed: '1800.00',
          savingsUsed: '0.00',
          pointsAwarded: '60.00',
        },
      ],
      events: [
        {
          id: 'event-1',
          triggerDay: 7,
          decisionExpiresAt: new Date('2026-09-14T12:00:30.000Z'),
          eventSnapshot: {
            title: 'Urgent car repair',
            context: 'Choose a fictional response.',
            options: [
              {
                id: 'pay_now',
                label: 'Pay now',
                immediateCost: '600.00',
                feeOrDebt: '0.00',
                scoreDelta: '12.00',
              },
            ],
          },
        },
      ],
      scoreEntries: [
        {
          id: 'score-1',
          sourceType: 'OBLIGATION_PAYMENT',
          sourceId: 'obligation-1',
          simulatedDay: 3,
          pointsDelta: '60.00',
          reason: 'Paid on time',
          createdAt,
        },
      ],
    });

    const result = await service.getSession('user-1', sessionId);

    expect(result.session).toEqual(
      expect.objectContaining({
        id: sessionId,
        pending: { type: 'EVENT_REVEAL', id: 'event-1' },
      }),
    );
    expect(result.allocation.options).toHaveLength(1);
    expect(result.allocation.selected).toBeNull();
    expect(result.obligations[0]).toEqual(
      expect.objectContaining({ id: 'obligation-1', pointsAwarded: '60.00' }),
    );
    expect(result.currentEvent).toEqual({
      id: 'event-1',
      triggerDay: 7,
      title: 'Urgent car repair',
      context: 'Choose a fictional response.',
      options: [
        {
          id: 'pay_now',
          label: 'Pay now',
          immediateCost: '600.00',
          feeOrDebt: '0.00',
        },
      ],
      decisionExpiresAt: '2026-09-14T12:00:30.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('scoreDelta');
    expect(JSON.stringify(result)).not.toContain(
      'Future event that must stay hidden',
    );
    expect(result.allowedActions).toEqual([]);
  });

  it('returns not found for a missing or foreign simulation', async () => {
    await expect(
      service.getSession('user-1', '00000000-0000-4000-8000-000000000011'),
    ).rejects.toThrow(new NotFoundException('SIMULATION_NOT_FOUND'));
  });

  it('returns gone only for the caller’s expired simulation', async () => {
    prisma.simulationSession.findFirst.mockResolvedValue({
      status: 'EXPIRED',
    });

    await expect(
      service.getSession('user-1', '00000000-0000-4000-8000-000000000012'),
    ).rejects.toThrow(new GoneException('SIMULATION_EXPIRED'));
  });

  it('rejects a malformed simulation ID before querying session data', async () => {
    await expect(service.getSession('user-1', 'not-a-uuid')).rejects.toThrow(
      new BadRequestException('SIMULATION_ID_INVALID'),
    );
    expect(prisma.simulationSession.findFirst).not.toHaveBeenCalled();
  });
});
