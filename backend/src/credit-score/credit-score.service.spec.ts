import { CreditScoreService } from './credit-score.service';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  RiskCapResult,
  PaymentStatusCounts,
} from './credit-score.constants';
import {
  RISK_CAPS,
  RISK_CAP_REASONS,
  CREDIT_SCORE_RANGE,
} from './credit-score.constants';

type PrismaMock = {
  user: { findUnique: jest.Mock };
  paymentOccurrence: {
    findMany: jest.Mock;
    aggregate: jest.Mock;
    count: jest.Mock;
  };
  paymentRecord: { groupBy: jest.Mock };
};

type CreditScoreServiceInternals = {
  calculatePaymentHistory: (userId: string) => Promise<number>;
  getWeightedHistoryScore: (
    status: string,
    daysLate: number | undefined,
  ) => number;
  getBudgetPressureScore: (ratio: number) => number;
  calculateBudgetPressureScore: (userId: string) => Promise<number>;
  getSavingsBufferScore: (committed: number, budget: number) => number;
  calculateHistoryLengthScore: (userId: string) => Promise<number>;
  calculateObligationDiversityScore: (
    userId: string,
    paymentHistoryScore: number,
  ) => Promise<number>;
  determineScoreTier: (score: number) => string | undefined;
  isOverBudgetForMonth: (
    userId: string,
    startOfMonth: Date,
    startOfNextMonth: Date,
  ) => Promise<boolean>;
  determineApplicableRiskCaps: (userId: string) => Promise<RiskCapResult>;
  countPaymentStatuses: (userId: string) => Promise<PaymentStatusCounts>;
};

describe('CreditScoreService', () => {
  let service: CreditScoreService;
  let internals: CreditScoreServiceInternals;
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));

    prisma = {
      user: { findUnique: jest.fn() },
      paymentOccurrence: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      paymentRecord: { groupBy: jest.fn() },
    };

    service = new CreditScoreService(prisma as unknown as PrismaService);
    internals = service as unknown as CreditScoreServiceInternals;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('calculatePaymentHistory', () => {
    it('returns 0 when there are no occurrences', async () => {
      prisma.paymentOccurrence.findMany.mockResolvedValue([]);

      await expect(internals.calculatePaymentHistory('user-1')).resolves.toBe(
        0,
      );
    });

    it('weights occurrences by obligation priority and treats null daysLate as on-time', async () => {
      prisma.paymentOccurrence.findMany.mockResolvedValue([
        {
          id: 'occ-1',
          user: { id: 'user-1', displayName: 'Test' },
          status: 'PAID',
          payment: { daysLate: null },
          obligation: { priority: 'CRITICAL' },
        },
        {
          id: 'occ-2',
          user: { id: 'user-1', displayName: 'Test' },
          status: 'MISSED',
          payment: { daysLate: undefined },
          obligation: { priority: 'LOW' },
        },
      ]);

      await expect(
        internals.calculatePaymentHistory('user-1'),
      ).resolves.toBeCloseTo(0.8);
    });
  });

  describe('getWeightedHistoryScore', () => {
    it.each([
      ['MISSED', 0],
      ['OVERDUE', 1],
    ])('returns the MISSED score for %s status', (status, daysLate) => {
      expect(internals.getWeightedHistoryScore(status, daysLate)).toBe(0);
    });

    it.each([
      [0, 1],
      [3, 0.85],
      [7, 0.7],
      [14, 0.5],
      [30, 0.25],
      [31, 0.05],
      [undefined, 0],
    ])('buckets daysLate=%p to score %f', (daysLate, expected) => {
      expect(internals.getWeightedHistoryScore('PAID_LATE', daysLate)).toBe(
        expected,
      );
    });
  });

  describe('getBudgetPressureScore', () => {
    it.each([
      [0.5, 1.0],
      [0.6, 0.75],
      [0.8, 0.5],
      [0.95, 0.25],
      [1.5, 0.0],
    ])('maps ratio %f to score %f', (ratio, expected) => {
      expect(internals.getBudgetPressureScore(ratio)).toBe(expected);
    });
  });

  describe('calculateBudgetPressureScore', () => {
    it('falls through to a zero score when the user has no monthly budget set', async () => {
      prisma.user.findUnique.mockResolvedValue({});
      prisma.paymentOccurrence.aggregate.mockResolvedValue({
        _sum: { amountDue: 100 },
      });

      await expect(
        internals.calculateBudgetPressureScore('user-1'),
      ).resolves.toBe(0.0);
    });

    it('scores a low commitment ratio as low pressure', async () => {
      prisma.user.findUnique.mockResolvedValue({ monthlyBudget: 1000 });
      prisma.paymentOccurrence.aggregate.mockResolvedValue({
        _sum: { amountDue: 300 },
      });

      await expect(
        internals.calculateBudgetPressureScore('user-1'),
      ).resolves.toBe(1.0);
    });
  });

  describe('getSavingsBufferScore', () => {
    it.each([
      [800, 1000, 1.0],
      [850, 1000, 0.7],
      [900, 1000, 0.3],
      [1200, 1000, 0.0],
      [0, 0, 0.0],
    ])('committed=%i budget=%i -> score %f', (committed, budget, expected) => {
      expect(internals.getSavingsBufferScore(committed, budget)).toBe(expected);
    });
  });

  describe('calculateHistoryLengthScore', () => {
    it('counts distinct year-month buckets, deduping repeats within a month', async () => {
      prisma.paymentOccurrence.findMany.mockResolvedValue([
        { dueDate: new Date('2026-01-05T00:00:00.000Z') },
        { dueDate: new Date('2026-01-20T00:00:00.000Z') },
        { dueDate: new Date('2026-02-10T00:00:00.000Z') },
      ]);

      await expect(
        internals.calculateHistoryLengthScore('user-1'),
      ).resolves.toBeCloseTo(2 / 24);
    });

    it('caps the score at 1 when history exceeds 24 months', async () => {
      const occurrences = Array.from({ length: 30 }, (_, i) => ({
        dueDate: new Date(Date.UTC(2020 + Math.floor(i / 12), i % 12, 1)),
      }));
      prisma.paymentOccurrence.findMany.mockResolvedValue(occurrences);

      await expect(
        internals.calculateHistoryLengthScore('user-1'),
      ).resolves.toBe(1);
    });
  });

  describe('calculateObligationDiversityScore', () => {
    it('excludes a type from success if it was ever also missed/overdue', async () => {
      prisma.paymentOccurrence.findMany.mockResolvedValue([
        { status: 'PAID', obligation: { type: 'RENT' } },
        { status: 'MISSED', obligation: { type: 'RENT' } },
        { status: 'PAID', obligation: { type: 'UTILITY' } },
      ]);

      await expect(
        internals.calculateObligationDiversityScore('user-1', 1),
      ).resolves.toBeCloseTo(1 / 3);
    });

    it('caps diversity at 0.4 when payment history score is below 0.5', async () => {
      prisma.paymentOccurrence.findMany.mockResolvedValue([
        { status: 'PAID', obligation: { type: 'RENT' } },
        { status: 'PAID', obligation: { type: 'UTILITY' } },
        { status: 'PAID', obligation: { type: 'SUBSCRIPTION' } },
      ]);

      await expect(
        internals.calculateObligationDiversityScore('user-1', 0.4),
      ).resolves.toBe(0.4);
    });
  });

  describe('determineScoreTier', () => {
    it.each([
      [300, 'BUILDING'],
      [580, 'FAIR'],
      [650, 'GOOD'],
      [720, 'EXCELLENT'],
      [780, 'ELITE'],
    ])('maps score %i to tier %s', (score, expected) => {
      expect(internals.determineScoreTier(score)).toBe(expected);
    });

    it('returns undefined for an out-of-range score', () => {
      expect(internals.determineScoreTier(299)).toBeUndefined();
      expect(internals.determineScoreTier(851)).toBeUndefined();
    });
  });

  describe('isOverBudgetForMonth', () => {
    it('returns false when monthlyBudget is 0 or unset, without querying commitments', async () => {
      prisma.user.findUnique.mockResolvedValue({ monthlyBudget: 0 });

      await expect(
        internals.isOverBudgetForMonth('user-1', new Date(), new Date()),
      ).resolves.toBe(false);
      expect(prisma.paymentOccurrence.aggregate).not.toHaveBeenCalled();
    });

    it('returns true when committed amount exceeds the budget', async () => {
      prisma.user.findUnique.mockResolvedValue({ monthlyBudget: 500 });
      prisma.paymentOccurrence.aggregate.mockResolvedValue({
        _sum: { amountDue: 600 },
      });

      await expect(
        internals.isOverBudgetForMonth('user-1', new Date(), new Date()),
      ).resolves.toBe(true);
    });
  });

  describe('determineApplicableRiskCaps', () => {
    const mockAllRiskChecks = (overrides: Partial<Record<string, boolean>>) => {
      jest
        .spyOn(service as any, 'hasNoPaymentHistory')
        .mockResolvedValue(overrides.hasNoPaymentHistory ?? false);
      jest
        .spyOn(service as any, 'hasOverduePaymentWithinPeriod')
        .mockResolvedValue(overrides.hasRecentOverduePayment ?? false);
      jest
        .spyOn(service as any, 'hasLatePaymentWithinPeriod')
        .mockResolvedValue(overrides.hasRecentLatePayment ?? false);
      jest
        .spyOn(service as any, 'hasMissedPaymentWithinPeriod')
        .mockResolvedValue(overrides.hasRecentMissedPayment ?? false);
      jest
        .spyOn(service as any, 'hasMissedCriticalObligationWithinPeriod')
        .mockResolvedValue(
          overrides.hasRecentMissedCriticalObligation ?? false,
        );
      jest
        .spyOn(service as any, 'isOverBudgetForMonth')
        .mockResolvedValue(overrides.isCurrentlyOverBudget ?? false);
    };

    it('returns NONE when no risk flags apply', async () => {
      mockAllRiskChecks({});

      await expect(
        internals.determineApplicableRiskCaps('user-1'),
      ).resolves.toEqual({
        applied: false,
        cap: RISK_CAPS.NONE,
        reason: RISK_CAP_REASONS.NONE,
      });
    });

    it('picks the strictest (lowest) cap when multiple risks apply', async () => {
      mockAllRiskChecks({
        isCurrentlyOverBudget: true,
        hasRecentMissedCriticalObligation: true,
        hasNoPaymentHistory: true,
      });

      await expect(
        internals.determineApplicableRiskCaps('user-1'),
      ).resolves.toEqual({
        applied: true,
        cap: RISK_CAPS.RECENT_MISSED_CRITICAL_OBLIGATION,
        reason: RISK_CAP_REASONS.RECENT_MISSED_CRITICAL_OBLIGATION,
      });
    });
  });

  describe('countPaymentStatuses', () => {
    it('defaults both counts to 0 when no groups are returned', async () => {
      prisma.paymentRecord.groupBy.mockResolvedValue([]);

      await expect(internals.countPaymentStatuses('user-1')).resolves.toEqual({
        onTimePaymentCount: 0,
        latePaymentCount: 0,
      });
    });

    it('extracts on-time and late counts from grouped results', async () => {
      prisma.paymentRecord.groupBy.mockResolvedValue([
        { paymentStatus: 'ON_TIME', _count: { _all: 5 } },
        { paymentStatus: 'LATE', _count: { _all: 2 } },
      ]);

      await expect(internals.countPaymentStatuses('user-1')).resolves.toEqual({
        onTimePaymentCount: 5,
        latePaymentCount: 2,
      });
    });
  });

  describe('getCreditScore', () => {
    const mockPerfectUser = () => {
      prisma.user.findUnique.mockResolvedValue({ monthlyBudget: 1000 });
      prisma.paymentOccurrence.aggregate.mockResolvedValue({
        _sum: { amountDue: 100 },
      });
      prisma.paymentOccurrence.findMany.mockResolvedValue([]);
      prisma.paymentOccurrence.count.mockResolvedValue(0);
      prisma.paymentRecord.groupBy.mockResolvedValue([]);
    };

    it('assembles the full credit score payload and reports the applied risk cap', async () => {
      mockPerfectUser();
      jest.spyOn(service as any, 'hasNoPaymentHistory').mockResolvedValue(true);

      const result = await service.getCreditScore('user-1');

      expect(result).toMatchObject({
        creditScore: 493,
        creditScoreTier: 'BUILDING',
        onTimePaymentCount: 0,
        onLatePaymentCount: 0,
      });
      expect(result.applicableRisks).toEqual({
        applied: true,
        cap: RISK_CAPS.NO_PAYMENT_HISTORY,
        reason: RISK_CAP_REASONS.NO_PAYMENT_HISTORY,
      });
      expect(result.reasonForRiskCaps).toContain(
        String(RISK_CAPS.NO_PAYMENT_HISTORY),
      );
    });

    it('reports no cap reason when no risk caps apply', async () => {
      mockPerfectUser();
      jest
        .spyOn(service as any, 'hasNoPaymentHistory')
        .mockResolvedValue(false);

      const result = await service.getCreditScore('user-1');

      expect(result.applicableRisks.applied).toBe(false);
      expect(result.reasonForRiskCaps).toBe('');
      expect(result.creditScore).toBeLessThanOrEqual(CREDIT_SCORE_RANGE.MAX);
      expect(result.creditScore).toBeGreaterThanOrEqual(CREDIT_SCORE_RANGE.MIN);
    });
  });
});
