import type { PrismaService } from '../prisma/prisma.service';
import { SimulationTransitionService } from './simulation-transition.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000090';
const completedAt = new Date('2026-09-25T10:00:00.000Z');
const createdAt = new Date('2026-09-01T10:00:00.000Z');

type SessionUpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

const journeyLedger = [
  {
    id: 'early-payment',
    sourceType: 'OBLIGATION_PAYMENT',
    sourceId: 'rent',
    simulatedDay: 2,
    pointsDelta: '50.00',
    reason: 'Early on-time payment',
    calculationData: { timing: 'EARLY', accountFactor: '1.00' },
    createdAt,
  },
  {
    id: 'random-bill-payment',
    sourceType: 'OBLIGATION_PAYMENT',
    sourceId: 'random-bill',
    simulatedDay: 12,
    pointsDelta: '25.00',
    reason: 'Paid introduced obligation',
    calculationData: { timing: 'EARLY', importance: 'HIGH' },
    createdAt: new Date(createdAt.getTime() + 1),
  },
  {
    id: 'event-choice',
    sourceType: 'EVENT_DECISION',
    sourceId: 'repair-event',
    simulatedDay: 8,
    pointsDelta: '30.00',
    reason: 'Selected affordable payment plan',
    calculationData: { feeOrDebt: '60.00', installmentsCreated: 1 },
    createdAt: new Date(createdAt.getTime() + 2),
  },
  {
    id: 'ordinary-miss',
    sourceType: 'OBLIGATION_MISSED',
    sourceId: 'utilities',
    simulatedDay: 15,
    pointsDelta: '-15.00',
    reason: 'Missed obligation: Utilities',
    calculationData: { amountDue: '300.00', importance: 'STANDARD' },
    createdAt: new Date(createdAt.getTime() + 3),
  },
  {
    id: 'installment-miss',
    sourceType: 'INSTALLMENT_MISSED',
    sourceId: 'repair-installment',
    simulatedDay: 30,
    pointsDelta: '-10.00',
    reason: 'Missed installment: Repair installment',
    calculationData: { amountDue: '400.00', importance: 'HIGH' },
    createdAt: new Date(createdAt.getTime() + 4),
  },
];

describe.each([false, true])(
  'completed simulation journey, timedMode=%s',
  (timedMode) => {
    it('finalises the saved journey and returns a reconciled complete ledger', async () => {
      let persistedCompletionSnapshot: unknown;
      const persistedSession = {
        id: sessionId,
        userId: 'user-1',
        status: 'ACTIVE',
        presentationHold: 'NONE',
        currentDay: 30,
        daysInMonth: 30,
        timedMode,
        nextDayAt: timedMode ? new Date(0) : null,
        currentBalance: '1000.00',
        savingsBalance: '1000.00',
        startingBudget: '6000.00',
        savingsRetentionMultiplier: '1.20',
        score: '90.00',
        completedAt: null,
        createdAt,
        updatedAt: completedAt,
        obligations: [
          {
            id: 'rent',
            templateCode: 'SIM_OBL_RENT',
            name: 'Rent',
            category: 'Housing',
            amountDue: '500.00',
            dueDay: 3,
            status: 'PAID',
            paidAt: createdAt,
            currentUsed: '500.00',
            savingsUsed: '0.00',
            pointsAwarded: '50.00',
            introducedByEventId: null,
            consequenceSnapshot: { importance: 'STANDARD' },
          },
          {
            id: 'random-bill',
            templateCode: 'SIM_OBL_RANDOM',
            name: 'Introduced bill',
            category: 'Household',
            amountDue: '250.00',
            dueDay: 24,
            status: 'PAID',
            paidAt: createdAt,
            currentUsed: '250.00',
            savingsUsed: '0.00',
            pointsAwarded: '25.00',
            introducedByEventId: null,
            consequenceSnapshot: { importance: 'HIGH' },
          },
          {
            id: 'utilities',
            templateCode: 'SIM_OBL_UTILITIES',
            name: 'Utilities',
            category: 'Utilities',
            amountDue: '300.00',
            dueDay: 10,
            status: 'MISSED',
            paidAt: null,
            currentUsed: '0.00',
            savingsUsed: '0.00',
            pointsAwarded: '0.00',
            introducedByEventId: null,
            consequenceSnapshot: { importance: 'STANDARD' },
          },
          {
            id: 'repair-installment',
            templateCode: 'SIM_INSTALLMENT_REPAIR',
            name: 'Repair installment',
            category: 'Debt',
            amountDue: '400.00',
            dueDay: 30,
            status: 'PAYABLE',
            paidAt: null,
            currentUsed: '0.00',
            savingsUsed: '0.00',
            pointsAwarded: '0.00',
            introducedByEventId: 'repair-event',
            consequenceSnapshot: {
              kind: 'INSTALLMENT',
              importance: 'HIGH',
              baseMissPenalty: '20.00',
              importanceWeight: '1.00',
              amountReference: '1000.00',
              minimumCostFactor: '0.50',
              maximumCostFactor: '1.50',
            },
          },
        ],
        events: [
          {
            id: 'repair-event',
            triggerDay: 8,
            status: 'RESOLVED',
            resolutionSnapshot: { feeOrDebt: '60.00' },
          },
        ],
        obligationSchedules: [],
      };
      const recentAndCompletionLedger = journeyLedger;
      const completedLedger = [
        ...journeyLedger,
        {
          id: 'budget-bonus',
          sourceType: 'FINAL_BUDGET_BONUS',
          sourceId: null,
          simulatedDay: 30,
          pointsDelta: '11.00',
          reason: 'Final budget efficiency bonus',
          calculationData: { remainingBudgetPercentage: '0.3667' },
          createdAt: completedAt,
        },
      ];
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: sessionId }]),
        simulationSession: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(persistedSession),
          update: jest.fn().mockResolvedValue({}),
          updateMany: jest
            .fn<Promise<{ count: number }>, [SessionUpdateManyArgs]>()
            .mockImplementation(({ data }) => {
              if ('completionSnapshot' in data) {
                persistedCompletionSnapshot = data.completionSnapshot;
              }
              return Promise.resolve({ count: 1 });
            }),
        },
        simulationObligationSchedule: { updateMany: jest.fn() },
        simulationObligation: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn(),
        },
        simulationEvent: { update: jest.fn() },
        simulationScoreEntry: {
          create: jest.fn().mockResolvedValue({}),
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue(recentAndCompletionLedger),
        },
        userEvent: {
          create: jest.fn().mockResolvedValue({ id: 'completion-event' }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn<
            Promise<unknown>,
            [
              (
                callback: (value: typeof tx) => Promise<unknown>,
              ) => Promise<unknown>,
            ]
          >()
          .mockImplementation((callback) => callback(tx)),
        simulationSession: {
          findFirst: jest
            .fn<Promise<unknown>, [unknown]>()
            .mockImplementation(() =>
              Promise.resolve({
                ...persistedSession,
                status: 'COMPLETED',
                presentationHold: 'SUMMARY',
                completedAt,
                completionSnapshot: persistedCompletionSnapshot,
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
                events: [],
              }),
            ),
        },
        simulationScoreEntry: {
          findMany: jest.fn().mockResolvedValue(completedLedger),
        },
      };
      const rewardService = {
        grantXp: jest.fn().mockResolvedValue({ xp: 15 }),
      };
      const badgeService = {
        evaluateSimulationBadges: jest.fn().mockResolvedValue([]),
      };
      const transition = new SimulationTransitionService(
        prisma as unknown as PrismaService,
        rewardService as never,
        badgeService as never,
      );
      const simulations = new SimulationsService(
        prisma as unknown as PrismaService,
      );

      const transitionResult = timedMode
        ? await transition.resolveDueTransitions(sessionId)
        : await transition.advanceOneDay(sessionId);
      expect(transitionResult).toEqual({
        currentDay: 30,
        stoppedFor: 'SUMMARY',
      });
      const completedSnapshot = persistedCompletionSnapshot;
      const detail = await simulations.getSession('user-1', sessionId);

      expect(detail.completion).toMatchObject({
        version: 'v2',
        obligations: { total: 4, paid: 2, missed: 2, unresolved: 0 },
        events: { total: 1, resolved: 1, expired: 0, unresolved: 0 },
        installments: { missedCount: 1, missedAmount: '400.00' },
        feesAndDebt: { count: 1, amount: '60.00' },
        scoreBySource: {
          OBLIGATION_PAYMENT: '75.00',
          EVENT_DECISION: '30.00',
          OBLIGATION_MISSED: '-15.00',
          INSTALLMENT_MISSED: '-10.00',
          FINAL_BUDGET_BONUS: '11.00',
        },
        finalScore: '91.00',
      });
      expect(detail.scoreLedger).toHaveLength(completedLedger.length);
      expect(detail.scoreLedger?.map((entry) => entry.id)).toEqual(
        completedLedger.map((entry) => entry.id),
      );
      expect(
        Object.values(detail.completion?.scoreBySource ?? {}).reduce(
          (sum, points) => sum + Math.round(Number(points) * 100),
          0,
        ),
      ).toBe(Math.round(Number(detail.completion?.finalScore) * 100));
      expect(completedSnapshot).toEqual(detail.completion);
      expect(rewardService.grantXp).toHaveBeenCalledWith(tx, {
        userId: 'user-1',
        amount: 15,
      });
      expect(badgeService.evaluateSimulationBadges).toHaveBeenCalledTimes(1);
    });
  },
);
