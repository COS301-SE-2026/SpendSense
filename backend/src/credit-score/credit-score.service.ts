import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_HISTORY_SCORES,
  PaymentStatusCounts,
  RiskCapResult,
  RISK_CAP_REASONS,
  HISTORY_LENGTH_CONFIG,
  BUDGET_PRESSURE,
  SAVINGS_BUFFER,
  CREDIT_SCORE_RANGE,
  CREDIT_SCORE_COMPONENT_WEIGHTS,
  PRIORITY_WEIGHTS,
  RISK_CAPS,
} from './credit-score.constants';
import {
  ObligationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  Prisma,
  ScoreEventType,
  ScoreTier,
} from '@prisma/client';

type CreditScoreDb = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CreditScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getCreditScore(userId: string, db: CreditScoreDb = this.prisma) {
    const paymentHistoryScore = await this.calculatePaymentHistory(userId, db);
    const paymentH =
      CREDIT_SCORE_COMPONENT_WEIGHTS.PAYMENT_HISTORY * paymentHistoryScore;

    const budgetPressure =
      CREDIT_SCORE_COMPONENT_WEIGHTS.BUDGET_PRESSURE *
      (await this.calculateBudgetPressureScore(userId, db));

    const savingsBuffer =
      CREDIT_SCORE_COMPONENT_WEIGHTS.SAVINGS_BUFFER *
      (await this.calculateSavingsBuffer(userId, db));

    const historyLength =
      CREDIT_SCORE_COMPONENT_WEIGHTS.HISTORY_LENGTH *
      (await this.calculateHistoryLengthScore(userId, db));

    const obligationDiveristy =
      CREDIT_SCORE_COMPONENT_WEIGHTS.OBLIGATION_DIVERSITY *
      (await this.calculateObligationDiversityScore(
        userId,
        paymentHistoryScore,
        db,
      ));

    const sumValues =
      paymentH +
      budgetPressure +
      savingsBuffer +
      historyLength +
      obligationDiveristy;
    const calculateScore =
      CREDIT_SCORE_RANGE.MIN + sumValues * CREDIT_SCORE_RANGE.RANGE;

    const applicableRisks = await this.determineApplicableRiskCaps(userId, db);
    const finalScore = Math.round(
      Math.min(calculateScore, applicableRisks.cap),
    );

    const finalScoreTier = this.determineScoreTier(finalScore);

    const PaymentCount = await this.countPaymentStatuses(userId, db);
    const onTimePaymentCount = PaymentCount.onTimePaymentCount;
    const onLatePaymentCount = PaymentCount.latePaymentCount;

    let reason = ``;
    if (applicableRisks.applied) {
      reason = `We have to cap your score at ${applicableRisks.cap}, because ${applicableRisks.reason}`;
    } else {
      reason = ``;
    }

    const missedPaymentCount = await this.countMissedPayments(userId, db);

    return {
      applicableRisks,
      reasonForRiskCaps: reason,
      creditScore: finalScore,
      creditScoreTier: finalScoreTier,
      savingsBuffer: Math.round(savingsBuffer),
      onTimePaymentCount,
      onLatePaymentCount,
      missedPaymentCount,
    };
  }

  private async calculatePaymentHistory(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    const occurrences = await db.paymentOccurrence.findMany({
      where: {
        userId,
        status: {
          in: [
            PaymentOccurrenceStatus.PAID,
            PaymentOccurrenceStatus.PAID_LATE,
            PaymentOccurrenceStatus.MISSED,
            PaymentOccurrenceStatus.OVERDUE,
          ],
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        status: true,
        payment: {
          select: {
            daysLate: true,
          },
        },
        obligation: {
          select: {
            priority: true,
          },
        },
      },
    });

    if (occurrences.length === 0) {
      return 0;
    }
    let weightedHistoryScore = 0;
    let priorityWeightTotal = 0;

    for (const occurrence of occurrences) {
      let daysLate = occurrence.payment?.daysLate;
      if (daysLate === null) {
        daysLate = 0;
      }
      const historyScore = this.getWeightedHistoryScore(
        occurrence.status,
        daysLate,
      );
      weightedHistoryScore +=
        historyScore * PRIORITY_WEIGHTS[occurrence.obligation.priority];
      priorityWeightTotal += PRIORITY_WEIGHTS[occurrence.obligation.priority];
    }

    if (priorityWeightTotal === 0) {
      return 0;
    }

    return weightedHistoryScore / priorityWeightTotal;
  }

  private getWeightedHistoryScore(
    occurrenceStatus: PaymentOccurrenceStatus,
    daysLate: number | undefined,
  ): number {
    if (
      occurrenceStatus === PaymentOccurrenceStatus.MISSED ||
      occurrenceStatus === PaymentOccurrenceStatus.OVERDUE
    ) {
      return PAYMENT_HISTORY_SCORES.MISSED;
    }

    if (daysLate === undefined) {
      return PAYMENT_HISTORY_SCORES.MISSED;
    }

    if (daysLate <= 0) {
      return PAYMENT_HISTORY_SCORES.ON_TIME;
    }

    if (daysLate <= 3) {
      return PAYMENT_HISTORY_SCORES.LATE_1_TO_3_DAYS;
    }

    if (daysLate <= 7) {
      return PAYMENT_HISTORY_SCORES.LATE_4_TO_7_DAYS;
    }

    if (daysLate <= 14) {
      return PAYMENT_HISTORY_SCORES.LATE_8_TO_14_DAYS;
    }

    if (daysLate <= 30) {
      return PAYMENT_HISTORY_SCORES.LATE_15_TO_30_DAYS;
    }

    return PAYMENT_HISTORY_SCORES.LATE_MORE_THAN_30_DAYS;
  }

  private async calculateBudgetPressureScore(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        monthlyBudget: true,
      },
    });

    const monthlyBudget = Number(user?.monthlyBudget);
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const result = await db.paymentOccurrence.aggregate({
      where: {
        userId,
        dueDate: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
        status: {
          not: PaymentOccurrenceStatus.CANCELLED,
        },
        obligation: {
          deletedAt: null,
        },
      },
      _sum: {
        amountDue: true,
      },
    });

    const monthlyCommittedObligations = Number(result._sum.amountDue ?? 0);
    const budgetPressureRatio = monthlyCommittedObligations / monthlyBudget;
    const budgetPressureRatioScore =
      this.getBudgetPressureScore(budgetPressureRatio);
    return budgetPressureRatioScore;
  }

  private getBudgetPressureScore(budgetPressureRatio: number): number {
    if (budgetPressureRatio <= 0.5) {
      return BUDGET_PRESSURE.LT_50;
    }

    if (budgetPressureRatio <= 0.7 && budgetPressureRatio > 0.5) {
      return BUDGET_PRESSURE.BTWN_50_70;
    }

    if (budgetPressureRatio <= 0.9 && budgetPressureRatio > 0.7) {
      return BUDGET_PRESSURE.BTWN_70_90;
    }

    if (budgetPressureRatio <= 1 && budgetPressureRatio > 0.9) {
      return BUDGET_PRESSURE.BTWN_90_100;
    }

    return BUDGET_PRESSURE.GT_100;
  }

  private async calculateSavingsBuffer(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        monthlyBudget: true,
      },
    });

    const monthlyBudget = Number(user?.monthlyBudget);
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const result = await db.paymentOccurrence.aggregate({
      where: {
        userId,
        dueDate: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
        status: {
          not: PaymentOccurrenceStatus.CANCELLED,
        },
        obligation: {
          deletedAt: null,
        },
      },
      _sum: {
        amountDue: true,
      },
    });

    const monthlyCommittedObligations = Number(result._sum.amountDue ?? 0);
    const savingsBufferRatio = this.getSavingsBufferScore(
      monthlyCommittedObligations,
      monthlyBudget,
    );

    return savingsBufferRatio;
  }

  private getSavingsBufferScore(
    commitedObligationAmount: number,
    MonthlyBudget: number,
  ): number {
    const numerator = MonthlyBudget - commitedObligationAmount;
    const savingsBufferRatio = numerator / MonthlyBudget;

    if (savingsBufferRatio >= 0.2) {
      return SAVINGS_BUFFER.GT_20;
    }

    if (savingsBufferRatio <= 0.2 && savingsBufferRatio > 0.1) {
      return SAVINGS_BUFFER.BTWN_10_20;
    }

    if (savingsBufferRatio <= 0.1 && savingsBufferRatio > 0.0) {
      return SAVINGS_BUFFER.BTWN_0_10;
    }

    return SAVINGS_BUFFER.OVER_BUDGET;
  }

  private async calculateHistoryLengthScore(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    const occurrences = await db.paymentOccurrence.findMany({
      where: {
        userId,
        status: {
          in: [
            PaymentOccurrenceStatus.PAID,
            PaymentOccurrenceStatus.PAID_LATE,
            PaymentOccurrenceStatus.MISSED,
            PaymentOccurrenceStatus.OVERDUE,
          ],
        },
      },
      select: {
        dueDate: true,
      },
    });

    const distinctMonths = new Set<string>();

    for (const occurrence of occurrences) {
      const year = occurrence.dueDate.getUTCFullYear();
      const month = occurrence.dueDate.getUTCMonth() + 1;

      distinctMonths.add(`${year}-${month}`);
    }

    const monthsWithPaymentHistory = distinctMonths.size;

    return Math.min(
      monthsWithPaymentHistory / HISTORY_LENGTH_CONFIG.MONTHS_FOR_MAX_SCORE,
      1,
    );
  }

  private async calculateObligationDiversityScore(
    userId: string,
    paymentHistoryScore: number,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    const calculationDate = new Date();

    const ninetyDaysAgo = new Date(calculationDate);

    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

    const occurrences = await db.paymentOccurrence.findMany({
      where: {
        obligation: {
          userId,
        },
        dueDate: {
          gte: ninetyDaysAgo,
          lte: calculationDate,
        },
        status: {
          in: [
            PaymentOccurrenceStatus.PAID,
            PaymentOccurrenceStatus.PAID_LATE,
            PaymentOccurrenceStatus.MISSED,
            PaymentOccurrenceStatus.OVERDUE,
          ],
        },
      },
      select: {
        status: true,
        obligation: {
          select: {
            type: true,
          },
        },
      },
    });

    const paidObligationTypes = new Set<ObligationType>();
    const failedObligationTypes = new Set<ObligationType>();

    for (const occurrence of occurrences) {
      const obligationType = occurrence.obligation.type;

      if (
        occurrence.status === PaymentOccurrenceStatus.PAID ||
        occurrence.status === PaymentOccurrenceStatus.PAID_LATE
      ) {
        paidObligationTypes.add(obligationType);
      }
      if (
        occurrence.status === PaymentOccurrenceStatus.MISSED ||
        occurrence.status === PaymentOccurrenceStatus.OVERDUE
      ) {
        failedObligationTypes.add(obligationType);
      }
    }

    let successfullyManagedTypes = 0;

    for (const obligationType of paidObligationTypes) {
      if (!failedObligationTypes.has(obligationType)) {
        successfullyManagedTypes++;
      }
    }

    let diversityScore = Math.min(successfullyManagedTypes / 3, 1);

    if (paymentHistoryScore < 0.5) {
      diversityScore = Math.min(diversityScore, 0.4);
    }

    return diversityScore;
  }

  private async determineApplicableRiskCaps(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<RiskCapResult> {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
    const startOfMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
    );

    const [
      hasNoPaymentHistory,
      hasRecentOverduePayment,
      hasRecentLatePayment,
      hasRecentMissedPayment,
      hasRecentMissedCriticalObligation,
      isCurrentlyOverBudget,
    ] = await Promise.all([
      this.hasNoPaymentHistory(userId, db),
      this.hasOverduePaymentWithinPeriod(userId, ninetyDaysAgo, today, db),
      this.hasLatePaymentWithinPeriod(userId, ninetyDaysAgo, today, db),
      this.hasMissedPaymentWithinPeriod(userId, ninetyDaysAgo, today, db),
      this.hasMissedCriticalObligationWithinPeriod(
        userId,
        ninetyDaysAgo,
        today,
        db,
      ),
      this.isOverBudgetForMonth(userId, startOfMonth, startOfNextMonth, db),
    ]);

    const applicableRiskCaps: RiskCapResult[] = [];

    if (hasNoPaymentHistory) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.NO_PAYMENT_HISTORY,
        reason: RISK_CAP_REASONS.NO_PAYMENT_HISTORY,
      });
    }

    if (hasRecentOverduePayment) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.CURRENT_OVERDUE_PAYMENT,
        reason: RISK_CAP_REASONS.CURRENT_OVERDUE_PAYMENT,
      });
    }

    if (hasRecentLatePayment) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.RECENT_LATE_15_TO_30,
        reason: RISK_CAP_REASONS.RECENT_LATE_15_TO_30,
      });
    }

    if (hasRecentMissedPayment) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.RECENT_MISSED_PAYMENT,
        reason: RISK_CAP_REASONS.RECENT_MISSED_PAYMENT,
      });
    }

    if (hasRecentMissedCriticalObligation) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.RECENT_MISSED_CRITICAL_OBLIGATION,
        reason: RISK_CAP_REASONS.RECENT_MISSED_CRITICAL_OBLIGATION,
      });
    }

    if (isCurrentlyOverBudget) {
      applicableRiskCaps.push({
        applied: true,
        cap: RISK_CAPS.OVER_BUDGET,
        reason: RISK_CAP_REASONS.OVER_BUDGET,
      });
    }

    if (applicableRiskCaps.length === 0) {
      return {
        applied: false,
        cap: RISK_CAPS.NONE,
        reason: RISK_CAP_REASONS.NONE,
      };
    }

    const strictestRiskCap = applicableRiskCaps.reduce(
      (lowestCap, currentCap) => {
        if (currentCap.cap < lowestCap.cap) {
          return currentCap;
        }
        return lowestCap;
      },
    );

    return {
      applied: true,
      cap: strictestRiskCap.cap,
      reason: strictestRiskCap.reason,
    };
  }

  private async hasNoPaymentHistory(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const paymentHistoryCount = await db.paymentOccurrence.count({
      where: {
        obligation: {
          userId,
        },
        status: {
          in: [
            PaymentOccurrenceStatus.PAID,
            PaymentOccurrenceStatus.PAID_LATE,
            PaymentOccurrenceStatus.MISSED,
          ],
        },
      },
    });
    return paymentHistoryCount === 0;
  }
  private async hasOverduePaymentWithinPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const overduePaymentCount = await db.paymentOccurrence.count({
      where: {
        obligation: {
          userId,
        },
        status: PaymentOccurrenceStatus.OVERDUE,
        dueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });
    return overduePaymentCount > 0;
  }
  private async hasLatePaymentWithinPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const latePaymentCount = await db.paymentOccurrence.count({
      where: {
        obligation: {
          userId,
        },
        status: PaymentOccurrenceStatus.PAID_LATE,
        dueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        payment: {
          daysLate: {
            gte: 15,
            lte: 30,
          },
        },
      },
    });
    return latePaymentCount > 0;
  }
  private async hasMissedPaymentWithinPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const missedPaymentCount = await db.paymentOccurrence.count({
      where: {
        obligation: {
          userId,
        },
        status: PaymentOccurrenceStatus.MISSED,
        dueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });
    return missedPaymentCount > 0;
  }
  private async hasMissedCriticalObligationWithinPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const missedCriticalCount = await db.paymentOccurrence.count({
      where: {
        obligation: {
          userId,
          priority: 'CRITICAL',
        },
        status: PaymentOccurrenceStatus.MISSED,
        dueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });
    return missedCriticalCount > 0;
  }
  private async isOverBudgetForMonth(
    userId: string,
    startOfMonth: Date,
    startOfNextMonth: Date,
    db: CreditScoreDb = this.prisma,
  ): Promise<boolean> {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        monthlyBudget: true,
      },
    });
    const monthlyBudget = Number(user?.monthlyBudget ?? 0);
    if (monthlyBudget <= 0) {
      return false;
    }
    const monthlyCommitments = await db.paymentOccurrence.aggregate({
      where: {
        obligation: {
          userId,
        },
        dueDate: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
        status: {
          not: PaymentOccurrenceStatus.CANCELLED,
        },
      },
      _sum: {
        amountDue: true,
      },
    });
    const committedAmount = Number(monthlyCommitments._sum.amountDue ?? 0);
    return committedAmount > monthlyBudget;
  }

  determineScoreTier(finalCreditScore: number): ScoreTier {
    if (finalCreditScore >= 300 && finalCreditScore <= 579) {
      return ScoreTier.BUILDING;
    }
    if (finalCreditScore >= 580 && finalCreditScore <= 649) {
      return ScoreTier.FAIR;
    }
    if (finalCreditScore >= 650 && finalCreditScore <= 719) {
      return ScoreTier.GOOD;
    }
    if (finalCreditScore >= 720 && finalCreditScore <= 779) {
      return ScoreTier.EXCELLENT;
    }
    if (finalCreditScore >= 780 && finalCreditScore <= 850) {
      return ScoreTier.ELITE;
    }
    return ScoreTier.BUILDING;
  }

  private async countPaymentStatuses(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<PaymentStatusCounts> {
    const groupedPayments = await db.paymentRecord.groupBy({
      by: ['paymentStatus'],
      where: {
        occurrence: {
          obligation: {
            userId,
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    let onTimePaymentCount = 0;
    let latePaymentCount = 0;

    for (const paymentGroup of groupedPayments) {
      if (paymentGroup.paymentStatus === PaymentRecordStatus.ON_TIME) {
        onTimePaymentCount = paymentGroup._count._all;
      }

      if (paymentGroup.paymentStatus === PaymentRecordStatus.LATE) {
        latePaymentCount = paymentGroup._count._all;
      }
    }

    return {
      onTimePaymentCount,
      latePaymentCount,
    };
  }

  // add to payments.service.ts to re-calculate the users credit score after making some kind of payment - this si to track score movements

  async recalculateAfterPayment(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      occurrenceId: string;
      paymentRecordId: string;
      eventType: ScoreEventType;
      explanation: string;
    },
  ) {
    const { userId, occurrenceId, paymentRecordId, eventType, explanation } =
      params;

    const creditProfile = await tx.creditProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currentScore: 600,
        previousScore: 600,
        scoreTier: ScoreTier.GOOD,
      },
    });

    const scoreBefore = creditProfile.currentScore;
    const tierBefore = creditProfile.scoreTier;

    const result = await this.getCreditScore(userId, tx);

    const scoreAfter = result.creditScore;
    const tierAfter = result.creditScoreTier;
    const scoreDelta = scoreAfter - scoreBefore;

    const updatedProfile = await tx.creditProfile.update({
      where: { id: creditProfile.id },
      data: {
        previousScore: scoreBefore,
        currentScore: scoreAfter,
        scoreTier: tierAfter,
        lastCalculatedAt: new Date(),
        onTimePaymentCount: result.onTimePaymentCount,
        latePaymentCount: result.onLatePaymentCount,
        missedPaymentCount: result.missedPaymentCount,
      },
    });

    const scoreEvent = await tx.scoreEvent.create({
      data: {
        userId,
        creditProfileId: creditProfile.id,
        occurrenceId,
        paymentRecordId,
        eventType,
        pointsDelta: scoreDelta,
        scoreBefore,
        scoreAfter,
        explanation,
        calculationMetadata: {
          applicableRisks: result.applicableRisks,
          reasonForRiskCaps: result.reasonForRiskCaps,
          modelVersion: 'v1',
        },
      },
    });

    return {
      scoreEventId: scoreEvent.id,

      scoreBefore,
      scoreAfter,
      scoreDelta,

      tierBefore,
      tierAfter,

      explanation: scoreEvent.explanation,

      onTimePaymentCount: updatedProfile.onTimePaymentCount,
      latePaymentCount: updatedProfile.latePaymentCount,
    };
  }

  // the following functionality is for MISSED and OVERDUE payment effects on the credit-score

  private async countMissedPayments(
    userId: string,
    db: CreditScoreDb = this.prisma,
  ): Promise<number> {
    return db.paymentOccurrence.count({
      where: {
        userId,
        status: PaymentOccurrenceStatus.MISSED,
        deletedAt: null,
      },
    });
  }

  async recalculateAfterOccurrenceStatusChange(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      occurrenceId: string;
      eventType: ScoreEventType;
      explanation: string;
    },
  ) {
    const { userId, occurrenceId, eventType, explanation } = params;

    const creditProfile = await tx.creditProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currentScore: 600,
        previousScore: 600,
        scoreTier: ScoreTier.GOOD,
      },
    });

    const scoreBefore = creditProfile.currentScore;
    const tierBefore = creditProfile.scoreTier;

    const result = await this.getCreditScore(userId, tx);
    const scoreAfter = result.creditScore;
    const tierAfter = result.creditScoreTier;
    const scoreDelta = scoreAfter - scoreBefore;

    const updatedProfile = await tx.creditProfile.update({
      where: {
        id: creditProfile.id,
      },
      data: {
        previousScore: scoreBefore,
        currentScore: scoreAfter,
        scoreTier: tierAfter,
        lastCalculatedAt: new Date(), // when this functions runs
        onTimePaymentCount: result.onTimePaymentCount,
        latePaymentCount: result.onLatePaymentCount,
        missedPaymentCount: result.missedPaymentCount,
      },
    });

    const scoreEvent = await tx.scoreEvent.create({
      data: {
        userId,
        creditProfileId: creditProfile.id,
        occurrenceId,
        paymentRecordId: null, // ther is no payment method for missed / overdue
        eventType,
        pointsDelta: scoreDelta,
        scoreBefore,
        scoreAfter,
        explanation,
        calculationMetadata: {
          applicableRisks: result.applicableRisks,
          reasonForRiskCaps: result.reasonForRiskCaps,
          modelVersion: 'v1',
        },
      },
    });

    return {
      scoreEventId: scoreEvent.id,
      scoreBefore,
      scoreAfter,
      scoreDelta,
      tierBefore,
      tierAfter,
      explanation: scoreEvent.explanation,
      onTimePaymentCount: updatedProfile.onTimePaymentCount,
      latePaymentCount: updatedProfile.latePaymentCount,
      missedPaymentCount: updatedProfile.missedPaymentCount,
    };
  }
}
