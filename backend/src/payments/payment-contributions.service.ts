import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  Currency,
  MascotMood,
  NotificationType,
  PaymentContributionSource,
  PaymentOccurrenceStatus,
  Prisma,
  ReminderStatus,
  ScoreEventType,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'node:crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { RewardService } from '../rewards/reward.service';
import { CreditScoreService } from '../credit-score/credit-score.service';

export type CreateContributionInput = {
  userId: string;
  occurrenceId: string;
  amount: Prisma.Decimal;
  currency: Currency;
  paidDate: Date;
  source: PaymentContributionSource;
  idempotencyKey: string;
  notes?: string;
  receiptScanId?: string;
};

type ContributionDb = PrismaService | Prisma.TransactionClient;

const ON_TIME_COINS = 15;
const ON_TIME_XP = 10;

@Injectable()
export class PaymentContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly badgeEngineService: BadgeEngineService,
    private readonly rewardService: RewardService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  async createContribution(input: CreateContributionInput) {
    const amount = new Prisma.Decimal(input.amount);

    // contribution must be positive.
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Payment contribution must be greater than zero.',
      );
    }

    const payloadHash = this.createPayloadHash(input);

    try {
      return this.prisma.$transaction(async (tx) => {
        // purpose of raw SQL: Lock this PaymentOccurrence row until this transaction finishes
        await tx.$queryRaw`
                SELECT "id"
                FROM "PaymentOccurrence"
                WHERE "id" = ${input.occurrenceId}
                AND "userId" = ${input.userId}
                AND "deletedAt" IS NULL
                FOR UPDATE
            `;

        // 1. Fetch occurances
        const occurrence = await tx.paymentOccurrence.findFirst({
          where: {
            id: input.occurrenceId,
            userId: input.userId,
            deletedAt: null,
          },
          include: {
            obligation: {
              select: {
                name: true,
              },
            },
          },
        });
        if (!occurrence) {
          throw new NotFoundException('Payment occurrence not found.');
        }

        // check idempodency BEFORE checking the occurance.status
        const replay = await this.getIdempotentReplay(tx, input, payloadHash);
        if (replay) {
          return replay;
        }

        // 1.2 chekc the status of the occurances
        const terminalStatuses: PaymentOccurrenceStatus[] = [
          PaymentOccurrenceStatus.PAID,
          PaymentOccurrenceStatus.PAID_LATE,
          PaymentOccurrenceStatus.MISSED,
          PaymentOccurrenceStatus.CANCELLED,
        ];
        if (terminalStatuses.includes(occurrence.status)) {
          throw new BadRequestException(
            'Payment occurrence cannot receive another contribution.',
          );
        }
        if (input.currency !== occurrence.currency) {
          throw new BadRequestException(
            'Payment currency does not match occurrence currency.',
          );
        }

        const remainingBefore = occurrence.amountDue.minus(
          occurrence.amountPaid,
        );

        if (remainingBefore.lessThan(0)) {
          throw new BadRequestException(
            'Payment occurrence has an invalid balance.',
          );
        }
        if (amount.greaterThan(remainingBefore)) {
          throw new BadRequestException(
            `Payment amount exceeds remaining balance of ${remainingBefore.toFixed(2)}.`,
          );
        }

        // 2. All occurance.status checks pass - now create a paymetnContribution
        const newAmountPaid = occurrence.amountPaid.plus(amount);
        const remainingAfter = occurrence.amountDue.minus(newAmountPaid);
        const settlesOccurrence = remainingAfter.equals(0);

        const contribution = await tx.paymentContribution.create({
          data: {
            userId: input.userId,

            occurrenceId: occurrence.id,
            obligationId: occurrence.obligationId,

            amount,
            currency: occurrence.currency,
            paidDate: input.paidDate,

            source: input.source,

            receiptScanId: input.receiptScanId ?? null,
            notes: input.notes ?? null,

            idempotencyKey: input.idempotencyKey,
            requestPayloadHash: payloadHash,
          },
        });

        //  2.1 for the the payment contribution is not settlig the occurance in full
        // CASE: PARTIALL_PAD ================================================================
        if (!settlesOccurrence) {
          const updatedOccurrence = await tx.paymentOccurrence.update({
            where: {
              id: occurrence.id,
            },
            data: {
              amountPaid: newAmountPaid,
              status: PaymentOccurrenceStatus.PARTIALLY_PAID,
              paidAt: null, // paidAt means FINAL settlement only
            },
          });

          return {
            replayed: false,

            contribution: {
              id: contribution.id,
              occurrenceId: contribution.occurrenceId,
              obligationId: contribution.obligationId,
              amount: contribution.amount.toFixed(2),
              currency: contribution.currency,
              paidDate: contribution.paidDate,
              source: contribution.source,
              state: contribution.state,
              receiptScanId: contribution.receiptScanId, // this could be NULL, does not have to be a partial contribution via OCR, could be manual.
              notes: contribution.notes,
              createdAt: contribution.createdAt,
            },
            occurrence: {
              id: updatedOccurrence.id,
              obligationId: updatedOccurrence.obligationId,
              obligationName: occurrence.obligation.name,
              dueDate: updatedOccurrence.dueDate,
              amountDue: updatedOccurrence.amountDue.toFixed(2),
              amountPaid: updatedOccurrence.amountPaid.toFixed(2),
              amountRemaining: remainingAfter.toFixed(2),
              currency: updatedOccurrence.currency,
              status: updatedOccurrence.status,
              paidAt: updatedOccurrence.paidAt,
            },
            settlement: null,
            scoreImpact: null,
            rewards: null,
          };
        }

        //  2.2 for the the payment contribution IS settlig the occurance in full
        // CASE: PAID VS PAID_LATE ? ================================================================
        const isLate =
          occurrence.overdueAt !== null ||
          occurrence.status === PaymentOccurrenceStatus.OVERDUE ||
          input.paidDate.getTime() > occurrence.dueDate.getTime();
        const finalStatus = isLate
          ? PaymentOccurrenceStatus.PAID_LATE
          : PaymentOccurrenceStatus.PAID;
        const daysLate = isLate
          ? Math.max(
              0,
              Math.ceil(
                (input.paidDate.getTime() - occurrence.dueDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

        const updatedOccurrence = await tx.paymentOccurrence.update({
          where: {
            id: occurrence.id,
          },

          data: {
            amountPaid: newAmountPaid,
            status: finalStatus,
            paidAt: input.paidDate,
          },
        });

        const settlementEffects = await this.runSettlementEffects(tx, {
          userId: input.userId,
          occurrenceId: occurrence.id,
          obligationId: occurrence.obligationId,
          obligationName: occurrence.obligation.name,
          contributionId: contribution.id,
          isLate,
          daysLate,
        });

        return {
          replayed: false,

          contribution: {
            id: contribution.id,
            occurrenceId: contribution.occurrenceId,
            obligationId: contribution.obligationId,
            amount: contribution.amount.toFixed(2),
            currency: contribution.currency,
            paidDate: contribution.paidDate,
            source: contribution.source,
            state: contribution.state,
            receiptScanId: contribution.receiptScanId,
            notes: contribution.notes,
            createdAt: contribution.createdAt,
          },

          occurrence: {
            id: updatedOccurrence.id,
            obligationId: updatedOccurrence.obligationId,
            obligationName: occurrence.obligation.name,
            dueDate: updatedOccurrence.dueDate,
            amountDue: updatedOccurrence.amountDue.toFixed(2),
            amountPaid: updatedOccurrence.amountPaid.toFixed(2),
            amountRemaining: remainingAfter.toFixed(2),
            currency: updatedOccurrence.currency,
            status: updatedOccurrence.status,
            paidAt: updatedOccurrence.paidAt,
          },

          settlement: {
            isLate,
            daysLate,
          },

          ...settlementEffects,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replay = await this.getIdempotentReplay(
          this.prisma,
          input,
          payloadHash,
        );

        if (replay) {
          return replay;
        }
      }
    }
  }

  private async runSettlementEffects(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      occurrenceId: string;
      obligationId: string;
      obligationName: string;
      contributionId: string;
      isLate: boolean;
      daysLate: number;
    },
  ) {
    const {
      userId,
      occurrenceId,
      obligationId,
      obligationName,
      contributionId,
      isLate,
      daysLate,
    } = params;

    const simulatedInterestCalculation = daysLate * 2;

    // create user evvent for the completion of a payment
    const paymentEvent = await tx.userEvent.create({
      data: {
        userId,
        eventType: isLate
          ? UserEventType.PAYMENT_LATE
          : UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD, // keep legacy system for the moment
        sourceId: contributionId,

        metadata: {
          occurrenceId,
          obligationId,
          contributionId,
          daysLate,
        },
      },
    });

    // credit score relcalculation
    const {
      scoreEventId,
      scoreBefore,
      scoreAfter,
      scoreDelta,
      tierBefore,
      tierAfter,
      explanation,
      onTimePaymentCount,
    } = await this.creditScoreService.recalculateAfterPayment(tx, {
      userId,
      occurrenceId,
      paymentContributionId: contributionId,

      eventType: isLate
        ? ScoreEventType.PAYMENT_LATE
        : ScoreEventType.PAYMENT_ON_TIME,

      explanation: isLate
        ? `Paid ${obligationName} ${daysLate} day${daysLate === 1 ? '' : 's'} late.`
        : `Paid ${obligationName} on time.`,
    });

    // score change user notification
    if (scoreAfter !== scoreBefore) {
      await this.notificationsService.create(
        {
          userId,
          type: NotificationType.SCORE_CHANGE,
          title: 'Credit score updated',

          message:
            scoreAfter > scoreBefore
              ? `Your simulated credit score increased from ${scoreBefore} to ${scoreAfter}.`
              : `Your simulated credit score decreased from ${scoreBefore} to ${scoreAfter}.`,

          sourceType: UserEventSourceType.PAYMENT_RECORD, // keep lgacy system for now
          sourceId: contributionId,
        },
        tx,
      );
    }

    // gamification profile
    const gamificationProfile = await tx.gamificationProfile.upsert({
      where: {
        userId,
      },

      update: {},

      create: {
        userId,
      },
    });

    const coinsAwarded = isLate ? 0 : ON_TIME_COINS;
    const xpAwarded = isLate ? 0 : ON_TIME_XP;
    const mascotMood = isLate ? MascotMood.STRESSED : MascotMood.HAPPY;

    // reward service logic for coincs, streak and mascot
    const settlement = await this.rewardService.settleAction(tx, {
      userId,
      sourceEventId: paymentEvent.id,

      coins: {
        amount: coinsAwarded,
        reason: 'On-time payment reward',
      },

      xp: {
        amount: xpAwarded,
      },

      streak: {
        field: 'currentPaymentStreak',
        advance: !isLate,
      },

      mood: {
        value: mascotMood,
        reason: isLate ? 'Late payment' : 'On-time payment',
      },
    });

    const coinBalance =
      settlement.coinBalance ?? gamificationProfile.coinBalance;

    const xp = settlement.xp ?? gamificationProfile.xp;

    const currentPaymentStreak = settlement.streak?.current ?? 0;

    const longestPaymentStreak = settlement.streak?.longest ?? 0;

    // handle the badge logic
    const badgesEarned = await this.badgeEngineService.evaluatePaymentBadges(
      {
        userId,
        sourceEventId: paymentEvent.id,
        onTimePaymentCount,
        currentPaymentStreak,
        currentScore: scoreAfter,
      },
      tx,
    );

    // stop reminders if the occurancs is fully settled
    await tx.reminder.updateMany({
      where: {
        occurrenceId,
        status: ReminderStatus.SCHEDULED,
        deletedAt: null,
      },

      data: {
        status: ReminderStatus.CANCELLED,
      },
    });

    // retunr the relevant things for the createContribution
    return {
      scoreImpact: {
        scoreEventId,
        previousScore: scoreBefore,
        currentScore: scoreAfter,
        delta: scoreDelta,
        tierBefore,
        tierAfter,
        explanation,
      },

      rewards: {
        coinsAwarded,
        xpAwarded,
        coinBalance,
        xp,
        currentPaymentStreak,
        longestPaymentStreak,
        mascotMood,
        badgesEarned,
      },

      paymentImpact: {
        isLate,
        daysLate,
        simulatedInterest: simulatedInterestCalculation,
      },
    };
  }

  private async getIdempotentReplay(
    db: ContributionDb,
    input: CreateContributionInput,
    payloadHash: string,
  ) {
    const existingContribution = await db.paymentContribution.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },

      include: {
        occurrence: {
          include: {
            obligation: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existingContribution) {
      return null;
    }
    if (existingContribution.requestPayloadHash !== payloadHash) {
      throw new ConflictException(
        'Idempotency key has already been used with different payment data.',
      );
    }

    const occurrence = existingContribution.occurrence;

    const amountRemaining = occurrence.amountDue.minus(occurrence.amountPaid);

    const hasSettled =
      occurrence.status === PaymentOccurrenceStatus.PAID ||
      occurrence.status === PaymentOccurrenceStatus.PAID_LATE;

    const isLate = occurrence.status === PaymentOccurrenceStatus.PAID_LATE;

    const daysLate =
      hasSettled && occurrence.paidAt
        ? Math.max(
            0,
            Math.ceil(
              (occurrence.paidAt.getTime() - occurrence.dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    return {
      replayed: true,

      contribution: {
        id: existingContribution.id,
        occurrenceId: existingContribution.occurrenceId,
        obligationId: existingContribution.obligationId,
        amount: existingContribution.amount.toFixed(2),
        currency: existingContribution.currency,
        paidDate: existingContribution.paidDate,
        source: existingContribution.source,
        state: existingContribution.state,
        receiptScanId: existingContribution.receiptScanId,
        notes: existingContribution.notes,
        createdAt: existingContribution.createdAt,
      },

      occurrence: {
        id: occurrence.id,
        obligationId: occurrence.obligationId,
        obligationName: occurrence.obligation.name,
        dueDate: occurrence.dueDate,
        amountDue: occurrence.amountDue.toFixed(2),
        amountPaid: occurrence.amountPaid.toFixed(2),
        amountRemaining: amountRemaining.toFixed(2),
        currency: occurrence.currency,
        status: occurrence.status,
        paidAt: occurrence.paidAt,
      },

      settlement: hasSettled ? { isLate, daysLate } : null,

      // not rerunning gamification functionality upon idenpodency reply
      scoreImpact: null,
      rewards: null,
    };
  }

  private createPayloadHash(input: CreateContributionInput): string {
    const payload = JSON.stringify({
      occurrenceId: input.occurrenceId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      paidDate: input.paidDate.toISOString(),
      source: input.source,
      receiptScanId: input.receiptScanId ?? null,
      notes: input.notes ?? null,
    });
    return createHash('sha256').update(payload).digest('hex');
  }
}
