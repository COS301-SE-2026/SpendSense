import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SimulationEventStatus,
  SimulationObligationStatus,
  SimulationPresentationHold,
  SimulationScoreSourceType,
  SimulationSessionStatus,
} from '@prisma/client';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';

const DAY_DURATION_MS = 15_000;
const EVENT_DECISION_DURATION_MS = 30_000;
const MISSED_OBLIGATION_POINTS = -20;
const FINAL_BUDGET_BONUS_CEILING_CENTS = 3_000;
export const SIMULATION_COMPLETION_XP = 15;

export type SimulationTransitionResult = {
  currentDay: number;
  stoppedFor: 'NONE' | 'PAYMENT' | 'EVENT' | 'EVENT_RESULT' | 'SUMMARY';
};

@Injectable()
export class SimulationTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly badgeEngineService: BadgeEngineService,
  ) {}

  async resolveDueTransitions(
    sessionId: string,
  ): Promise<SimulationTransitionResult> {
    return this.prisma.$transaction((tx) =>
      this.resolveInTransaction(tx, sessionId, false),
    );
  }

  async advanceOneDay(sessionId: string): Promise<SimulationTransitionResult> {
    return this.prisma.$transaction((tx) =>
      this.advanceOneDayInTransaction(tx, sessionId),
    );
  }

  /**
   * Allows a state-changing route to include the day transition and its
   * idempotency action snapshot in one database transaction.
   */
  async advanceOneDayInTransaction(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<SimulationTransitionResult> {
    return this.resolveInTransaction(tx, sessionId, true);
  }

  /** Allows another simulation action to settle timed state atomically first. */
  async resolveDueTransitionsInTransaction(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<SimulationTransitionResult> {
    return this.resolveInTransaction(tx, sessionId, false);
  }

  private async resolveInTransaction(
    tx: Prisma.TransactionClient,
    sessionId: string,
    manuallyAdvance: boolean,
  ): Promise<SimulationTransitionResult> {
    const session = await tx.simulationSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        obligations: { orderBy: [{ dueDay: 'asc' }, { createdAt: 'asc' }] },
        events: { orderBy: [{ triggerDay: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (session.status === SimulationSessionStatus.COMPLETED) {
      await this.settleCompletionRewards(tx, session.id, session.userId);
      return this.result(session.currentDay, 'SUMMARY');
    }
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      return this.result(session.currentDay, 'NONE');
    }

    const now = new Date();
    const revealed = session.events.find(
      (event) => event.status === SimulationEventStatus.REVEALED,
    );
    if (revealed) {
      if (
        session.timedMode &&
        revealed.decisionExpiresAt &&
        revealed.decisionExpiresAt <= now
      ) {
        const expiryOutcome = this.expiryOutcome(revealed.eventSnapshot);
        const debit = this.debitBalances(
          session.currentBalance,
          session.savingsBalance,
          expiryOutcome?.immediateCost,
          expiryOutcome?.feeOrDebt,
        );
        await tx.simulationEvent.update({
          where: { id: revealed.id },
          data: {
            status: SimulationEventStatus.EXPIRED,
            resolvedAt: now,
            resolutionSnapshot: this.expirySnapshot(
              revealed.eventSnapshot,
              debit.uncoveredAmount,
            ) as Prisma.InputJsonValue,
          },
        });
        if (expiryOutcome?.introducedObligation) {
          await tx.simulationObligation.create({
            data: {
              sessionId,
              introducedByEventId: revealed.id,
              templateCode: expiryOutcome.introducedObligation.templateCode,
              name: expiryOutcome.introducedObligation.name,
              category: expiryOutcome.introducedObligation.category,
              amountDue: expiryOutcome.introducedObligation.amountDue,
              dueDay: expiryOutcome.introducedObligation.dueDay,
              consequenceSnapshot: {
                basePoints: expiryOutcome.introducedObligation.basePoints,
                savingsPointsFactor:
                  expiryOutcome.introducedObligation.savingsPointsFactor,
                importance: expiryOutcome.introducedObligation.importance,
                importanceWeight:
                  expiryOutcome.introducedObligation.importanceWeight,
                baseMissPenalty:
                  expiryOutcome.introducedObligation.baseMissPenalty,
              },
            },
          });
        }
        if (expiryOutcome) {
          await tx.simulationScoreEntry.create({
            data: {
              sessionId,
              sourceType: SimulationScoreSourceType.EVENT_EXPIRY,
              sourceId: revealed.id,
              simulatedDay: session.currentDay,
              pointsDelta: expiryOutcome.scoreDelta,
              reason: 'Surprise event decision timed out',
              calculationData: {
                outcomeId: expiryOutcome.id,
                immediateCost: expiryOutcome.immediateCost,
                feeOrDebt: expiryOutcome.feeOrDebt,
                uncoveredAmount: debit.uncoveredAmount,
              },
            },
          });
        }
        await tx.simulationSession.update({
          where: { id: sessionId },
          data: {
            currentBalance: debit.currentBalance,
            savingsBalance: debit.savingsBalance,
            ...(expiryOutcome && {
              score: { increment: expiryOutcome.scoreDelta },
            }),
            nextDayAt: null,
            presentationHold: SimulationPresentationHold.EVENT_RESULT,
          },
        });
        return this.result(session.currentDay, 'EVENT_RESULT');
      }
      return this.result(session.currentDay, 'EVENT');
    }

    const initialStop = await this.stopForCurrentDay(tx, session, now);
    if (initialStop !== 'NONE') {
      return this.result(session.currentDay, initialStop);
    }

    if (manuallyAdvance) {
      if (session.timedMode) {
        return this.result(session.currentDay, 'NONE');
      }
      return this.advanceBoundary(tx, session, now);
    }
    if (!session.timedMode || !session.nextDayAt || session.nextDayAt > now) {
      return this.result(session.currentDay, 'NONE');
    }

    let current = session;
    while (current.nextDayAt && current.nextDayAt <= now) {
      const transition = await this.advanceBoundary(tx, current, now);
      if (transition.stoppedFor !== 'NONE') {
        return transition;
      }
      current = await tx.simulationSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
          obligations: { orderBy: [{ dueDay: 'asc' }, { createdAt: 'asc' }] },
          events: { orderBy: [{ triggerDay: 'asc' }, { createdAt: 'asc' }] },
        },
      });
    }
    return this.result(current.currentDay, 'NONE');
  }

  private async advanceBoundary(
    tx: Prisma.TransactionClient,
    session: {
      id: string;
      currentDay: number;
      daysInMonth: number;
      timedMode: boolean;
      nextDayAt: Date | null;
    },
    now: Date,
  ): Promise<SimulationTransitionResult> {
    if (session.currentDay >= session.daysInMonth) {
      return this.finalizeSession(tx, session.id, now);
    }

    const nextDay = session.currentDay + 1;
    await tx.simulationSession.update({
      where: { id: session.id },
      data: {
        currentDay: nextDay,
        nextDayAt: session.timedMode
          ? new Date((session.nextDayAt ?? now).getTime() + DAY_DURATION_MS)
          : null,
      },
    });

    const refreshed = await tx.simulationSession.findUniqueOrThrow({
      where: { id: session.id },
      include: {
        obligations: { orderBy: [{ dueDay: 'asc' }, { createdAt: 'asc' }] },
        events: { orderBy: [{ triggerDay: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    const stoppedFor = await this.stopForCurrentDay(tx, refreshed, now);
    return this.result(nextDay, stoppedFor);
  }

  private async stopForCurrentDay(
    tx: Prisma.TransactionClient,
    session: {
      id: string;
      currentDay: number;
      timedMode: boolean;
      currentBalance: unknown;
      savingsBalance: unknown;
      obligations: Array<{
        id: string;
        name: string;
        dueDay: number;
        status: SimulationObligationStatus;
      }>;
      events: Array<{
        id: string;
        triggerDay: number;
        status: SimulationEventStatus;
      }>;
    },
    now: Date,
  ): Promise<SimulationTransitionResult['stoppedFor']> {
    const overdueObligations = session.obligations.filter(
      (obligation) =>
        obligation.dueDay < session.currentDay &&
        (obligation.status === SimulationObligationStatus.SCHEDULED ||
          obligation.status === SimulationObligationStatus.PAYABLE),
    );
    if (overdueObligations.length > 0) {
      await tx.simulationObligation.updateMany({
        where: {
          id: { in: overdueObligations.map((obligation) => obligation.id) },
        },
        data: { status: SimulationObligationStatus.MISSED },
      });
      await tx.simulationScoreEntry.createMany({
        data: overdueObligations.map((obligation) => ({
          sessionId: session.id,
          sourceType: SimulationScoreSourceType.OBLIGATION_MISSED,
          sourceId: obligation.id,
          simulatedDay: session.currentDay,
          pointsDelta: MISSED_OBLIGATION_POINTS,
          reason: `Missed obligation: ${obligation.name}`,
          calculationData: { penalty: Math.abs(MISSED_OBLIGATION_POINTS) },
        })),
      });
      await tx.simulationSession.update({
        where: { id: session.id },
        data: {
          score: {
            increment: MISSED_OBLIGATION_POINTS * overdueObligations.length,
          },
        },
      });
    }

    const dueIds = session.obligations
      .filter(
        (obligation) =>
          obligation.dueDay <= session.currentDay &&
          obligation.status === SimulationObligationStatus.SCHEDULED,
      )
      .map((obligation) => obligation.id);
    if (dueIds.length > 0) {
      await tx.simulationObligation.updateMany({
        where: { id: { in: dueIds } },
        data: { status: SimulationObligationStatus.PAYABLE },
      });
      await tx.simulationSession.update({
        where: { id: session.id },
        data: { nextDayAt: null },
      });
      return 'PAYMENT';
    }

    const event = session.events.find(
      (candidate) =>
        candidate.triggerDay <= session.currentDay &&
        candidate.status === SimulationEventStatus.SCHEDULED,
    );
    if (event) {
      await tx.simulationEvent.update({
        where: { id: event.id },
        data: {
          status: SimulationEventStatus.REVEALED,
          revealedAt: now,
          decisionExpiresAt: session.timedMode
            ? new Date(now.getTime() + EVENT_DECISION_DURATION_MS)
            : null,
        },
      });
      await tx.simulationSession.update({
        where: { id: session.id },
        data: {
          nextDayAt: null,
          presentationHold: SimulationPresentationHold.EVENT_REVEAL,
        },
      });
      return 'EVENT';
    }
    return 'NONE';
  }

  private expirySnapshot(
    eventSnapshot: unknown,
    uncoveredAmount: string,
  ): Record<string, unknown> {
    if (
      typeof eventSnapshot === 'object' &&
      eventSnapshot !== null &&
      'expiryOutcome' in eventSnapshot
    ) {
      return {
        outcome: 'TIMED_OUT',
        option: eventSnapshot.expiryOutcome,
        uncoveredAmount,
      };
    }
    return { outcome: 'TIMED_OUT', uncoveredAmount };
  }

  private async finalizeSession(
    tx: Prisma.TransactionClient,
    sessionId: string,
    completedAt: Date,
  ): Promise<SimulationTransitionResult> {
    const session = await tx.simulationSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        obligations: true,
        events: true,
      },
    });
    if (
      session.status !== SimulationSessionStatus.ACTIVE ||
      session.currentDay < session.daysInMonth
    ) {
      return this.result(session.currentDay, 'SUMMARY');
    }

    const summary = this.completionSummary(session, completedAt);
    const update = await tx.simulationSession.updateMany({
      where: {
        id: sessionId,
        status: SimulationSessionStatus.ACTIVE,
        currentDay: { gte: session.daysInMonth },
      },
      data: {
        status: SimulationSessionStatus.COMPLETED,
        completedAt,
        nextDayAt: null,
        pausedAt: null,
        pausedDecisionSeconds: null,
        presentationHold: SimulationPresentationHold.SUMMARY,
        score: summary.finalScore,
        completionSnapshot: summary,
      },
    });
    if (update.count === 0) {
      return this.result(session.currentDay, 'SUMMARY');
    }
    await tx.simulationScoreEntry.create({
      data: {
        sessionId,
        sourceType: SimulationScoreSourceType.FINAL_BUDGET_BONUS,
        simulatedDay: session.currentDay,
        pointsDelta: summary.budgetBonus,
        reason: 'Final budget efficiency bonus',
        calculationData: {
          startingBudget: summary.startingBudget,
          totalRemaining: summary.totalRemaining,
          weightedRemaining: summary.weightedRemaining,
          remainingBudgetPercentage: summary.remainingBudgetPercentage,
          savingsRetentionMultiplier: summary.savingsRetentionMultiplier,
          bonusCeiling: this.moneyFromCents(FINAL_BUDGET_BONUS_CEILING_CENTS),
        },
      },
    });
    await this.settleCompletionRewards(tx, sessionId, session.userId);
    return this.result(session.currentDay, 'SUMMARY');
  }

  private async settleCompletionRewards(
    tx: Prisma.TransactionClient,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const claimed = await tx.simulationSession.updateMany({
      where: {
        id: sessionId,
        status: SimulationSessionStatus.COMPLETED,
        completionRewardGrantedAt: null,
      },
      data: { completionRewardGrantedAt: new Date() },
    });
    if (claimed.count === 0) {
      return;
    }
    const event = await tx.userEvent.create({
      data: {
        userId,
        eventType: 'SIMULATION_COMPLETED',
        sourceType: 'SIMULATION_SESSION',
        sourceId: sessionId,
        metadata: {
          fictional: true,
          xpAwarded: SIMULATION_COMPLETION_XP,
          coinsAwarded: 0,
        },
      },
    });
    await this.rewardService.grantXp(tx, {
      userId,
      amount: SIMULATION_COMPLETION_XP,
    });
    await this.badgeEngineService.evaluateSimulationBadges(
      { userId, sourceEventId: event.id },
      tx,
    );
  }

  private completionSummary(
    session: {
      currentDay: number;
      startingBudget: unknown;
      currentBalance: unknown;
      savingsBalance: unknown;
      savingsRetentionMultiplier: unknown;
      score: unknown;
      obligations: Array<{ status: SimulationObligationStatus }>;
      events: Array<{ status: SimulationEventStatus }>;
    },
    completedAt: Date,
  ): {
    version: 'v1';
    completedAt: string;
    startingBudget: string;
    currentBalance: string;
    savingsBalance: string;
    totalRemaining: string;
    weightedRemaining: string;
    remainingBudgetPercentage: string;
    savingsRetentionMultiplier: string;
    budgetBonus: string;
    finalScore: string;
    obligations: {
      total: number;
      paid: number;
      missed: number;
      unresolved: number;
    };
    events: {
      total: number;
      resolved: number;
      expired: number;
      unresolved: number;
    };
  } {
    const startingBudgetCents = this.requiredCents(
      session.startingBudget,
      'starting budget',
    );
    const currentBalanceCents = this.requiredCents(
      session.currentBalance,
      'current balance',
    );
    const savingsBalanceCents = this.requiredCents(
      session.savingsBalance,
      'savings balance',
    );
    const scoreCents = this.requiredSignedCents(session.score, 'score');
    const multiplierCents = this.requiredCents(
      session.savingsRetentionMultiplier,
      'savings retention multiplier',
    );
    const totalRemainingCents = currentBalanceCents + savingsBalanceCents;
    const weightedRemainingCents =
      currentBalanceCents +
      Math.round((savingsBalanceCents * multiplierCents) / 100);
    const remainingBudgetPercentage =
      startingBudgetCents === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, weightedRemainingCents / startingBudgetCents),
          );
    const budgetBonusCents = Math.round(
      FINAL_BUDGET_BONUS_CEILING_CENTS * remainingBudgetPercentage,
    );
    const count = <T>(items: T[], predicate: (item: T) => boolean): number =>
      items.filter(predicate).length;

    return {
      version: 'v1',
      completedAt: completedAt.toISOString(),
      startingBudget: this.moneyFromCents(startingBudgetCents),
      currentBalance: this.moneyFromCents(currentBalanceCents),
      savingsBalance: this.moneyFromCents(savingsBalanceCents),
      totalRemaining: this.moneyFromCents(totalRemainingCents),
      weightedRemaining: this.moneyFromCents(weightedRemainingCents),
      remainingBudgetPercentage: remainingBudgetPercentage.toFixed(4),
      savingsRetentionMultiplier: this.moneyFromCents(multiplierCents),
      budgetBonus: this.moneyFromCents(budgetBonusCents),
      finalScore: this.moneyFromCents(scoreCents + budgetBonusCents),
      obligations: {
        total: session.obligations.length,
        paid: count(
          session.obligations,
          (obligation) => obligation.status === SimulationObligationStatus.PAID,
        ),
        missed: count(
          session.obligations,
          (obligation) =>
            obligation.status === SimulationObligationStatus.MISSED,
        ),
        unresolved: count(
          session.obligations,
          (obligation) =>
            obligation.status === SimulationObligationStatus.SCHEDULED ||
            obligation.status === SimulationObligationStatus.PAYABLE,
        ),
      },
      events: {
        total: session.events.length,
        resolved: count(
          session.events,
          (event) => event.status === SimulationEventStatus.RESOLVED,
        ),
        expired: count(
          session.events,
          (event) => event.status === SimulationEventStatus.EXPIRED,
        ),
        unresolved: count(
          session.events,
          (event) =>
            event.status === SimulationEventStatus.SCHEDULED ||
            event.status === SimulationEventStatus.REVEALED,
        ),
      },
    };
  }

  private expiryOutcome(eventSnapshot: unknown): {
    id: string;
    immediateCost: string;
    feeOrDebt: string;
    scoreDelta: string;
    introducedObligation?: {
      templateCode: string;
      name: string;
      category: string;
      amountDue: string;
      dueDay: number;
      basePoints: string;
      savingsPointsFactor: string;
      importance: string;
      importanceWeight: string;
      baseMissPenalty: string;
    };
  } | null {
    const snapshot = this.record(eventSnapshot);
    const outcome = this.record(snapshot?.expiryOutcome);
    const id = this.string(outcome?.id);
    const immediateCost = this.money(outcome?.immediateCost);
    const feeOrDebt = this.money(outcome?.feeOrDebt);
    const scoreDelta = this.signedMoney(outcome?.scoreDelta);
    if (!id || !immediateCost || !feeOrDebt || !scoreDelta) {
      return null;
    }

    const obligation = this.record(outcome?.introducedObligation);
    const templateCode = this.string(obligation?.templateCode);
    const name = this.string(obligation?.name);
    const category = this.string(obligation?.category);
    const amountDue = this.money(obligation?.amountDue);
    const dueDay = obligation?.dueDay;
    const basePoints = this.money(obligation?.basePoints);
    const savingsPointsFactor = this.money(obligation?.savingsPointsFactor);
    const rawImportance = this.string(obligation?.importance);
    const importance =
      rawImportance === 'CRITICAL' ||
      rawImportance === 'HIGH' ||
      rawImportance === 'STANDARD' ||
      rawImportance === 'LOW'
        ? rawImportance
        : 'STANDARD';
    const importanceWeight = this.money(obligation?.importanceWeight) ?? '1.00';
    const baseMissPenalty = this.money(obligation?.baseMissPenalty) ?? '20.00';
    const introducedObligation =
      templateCode &&
      name &&
      category &&
      amountDue &&
      typeof dueDay === 'number' &&
      Number.isInteger(dueDay) &&
      basePoints &&
      savingsPointsFactor
        ? {
            templateCode,
            name,
            category,
            amountDue,
            dueDay,
            basePoints,
            savingsPointsFactor,
            importance,
            importanceWeight,
            baseMissPenalty,
          }
        : undefined;

    return { id, immediateCost, feeOrDebt, scoreDelta, introducedObligation };
  }

  private debitBalances(
    currentBalance: unknown,
    savingsBalance: unknown,
    immediateCost: string | undefined,
    feeOrDebt: string | undefined,
  ): {
    currentBalance: string;
    savingsBalance: string;
    uncoveredAmount: string;
  } {
    const currentCents = this.cents(currentBalance) ?? 0;
    const savingsCents = this.cents(savingsBalance) ?? 0;
    const totalCost =
      (this.cents(immediateCost) ?? 0) + (this.cents(feeOrDebt) ?? 0);
    const currentUsed = Math.min(currentCents, totalCost);
    const remaining = totalCost - currentUsed;
    const savingsUsed = Math.min(savingsCents, remaining);
    return {
      currentBalance: this.moneyFromCents(currentCents - currentUsed),
      savingsBalance: this.moneyFromCents(savingsCents - savingsUsed),
      uncoveredAmount: this.moneyFromCents(remaining - savingsUsed),
    };
  }

  private cents(value: unknown): number | null {
    let candidate: string | null = null;
    if (typeof value === 'string' || typeof value === 'number') {
      candidate = String(value);
    } else if (value instanceof Prisma.Decimal) {
      candidate = value.toString();
    }
    if (!candidate || !/^-?\d+(?:\.\d{1,2})?$/.test(candidate)) {
      return null;
    }
    const [whole, fraction = ''] = candidate.split('.');
    const sign = whole.startsWith('-') ? -1 : 1;
    return (
      sign * (Math.abs(Number(whole)) * 100 + Number(fraction.padEnd(2, '0')))
    );
  }

  private requiredCents(value: unknown, label: string): number {
    const cents = this.cents(value);
    if (cents === null || cents < 0) {
      throw new Error(`Simulation completion has an invalid ${label}`);
    }
    return cents;
  }

  private requiredSignedCents(value: unknown, label: string): number {
    const cents = this.cents(value);
    if (cents === null) {
      throw new Error(`Simulation completion has an invalid ${label}`);
    }
    return cents;
  }

  private money(value: unknown): string | null {
    const cents = this.cents(value);
    return cents === null || cents < 0 ? null : this.moneyFromCents(cents);
  }

  private signedMoney(value: unknown): string | null {
    const cents = this.cents(value);
    return cents === null ? null : this.moneyFromCents(cents);
  }

  private moneyFromCents(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(cents);
    return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
  }

  private record(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null;
  }

  private string(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private result(
    currentDay: number,
    stoppedFor: SimulationTransitionResult['stoppedFor'],
  ): SimulationTransitionResult {
    return { currentDay, stoppedFor };
  }
}
