import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MascotMood,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  Prisma,
  RewardTransactionType,
  ScoreEventType,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LogPaymentDto } from './dto/log-payment.dto';

const ON_TIME_SCORE_DELTA = 8;
const LATE_SCORE_DELTA = -8;
const ON_TIME_COINS = 15;
const ON_TIME_XP = 10;
const MIN_SCORE = 0;
const MAX_SCORE = 850;

type LogPaymentResult = {
  message: string;
  payment: {
    id: string;
    occurrenceId: string;
    obligationId: string;
    amountPaid: number;
    currency: string;
    paidDate: Date;
    paymentStatus: PaymentRecordStatus;
    daysLate: number;
    simulatedInterest: number;
    notes: string | null;
  };
  occurrence: {
    id: string;
    status: PaymentOccurrenceStatus;
    paidAt: Date | null;
  };
  scoreImpact: {
    scoreEventId: string;
    previousScore: number;
    currentScore: number;
    delta: number;
    tierBefore: ScoreTier;
    tierAfter: ScoreTier;
    explanation: string;
  };
  rewards: {
    coinsAwarded: number;
    xpAwarded: number;
    coinBalance: number;
    xp: number;
    currentPaymentStreak: number;
    longestPaymentStreak: number;
    mascotMood: MascotMood;
    badgesEarned: string[];
  };
  paymentImpact: {
    isLate: boolean;
    daysLate: number;
    simulatedInterest: number;
  };
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async logPayment(
    dto: LogPaymentDto,
    userId: string,
  ): Promise<LogPaymentResult> {
    // below means "go to the "PaymentOccurance" table and find the row where 'id' = 'occuranceId'
    // NOTE AGAIN - this 'occuranceId' is passed from the frontent
    const occurrence = await this.prisma.paymentOccurrence.findFirst({
      where: {
        id: dto.occurrenceId,
        userId: userId,
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
      throw new NotFoundException('The occuranceId Cold not be found');
    }

    if (
      occurrence.status === PaymentOccurrenceStatus.PAID ||
      occurrence.status === PaymentOccurrenceStatus.PAID_LATE
    ) {
      throw new BadRequestException(
        'Error. There is already and existing payment for this occuranceId.',
      );
    }

    if (
      occurrence.status === PaymentOccurrenceStatus.MISSED ||
      occurrence.status === PaymentOccurrenceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'This Occurance Has Been Missed Or cancelled, User cannot try pay for ti.',
      );
    }

    // for demo 1, we're assuming the idea clinet that pays the expected amount due:
    const amountPaid = new Prisma.Decimal(dto.amountPaid);
    if (!amountPaid.equals(occurrence.amountDue)) {
      throw new BadRequestException(
        `Amount paid must equal the amount due. Expected ${occurrence.amountDue.toString()}, received ${amountPaid.toString()}.`,
      );
    }

    // Calculating weather or not this payment is happening on time or - if not - how may days late it is
    const paidDate = new Date(dto.paidDate);
    const isLate = paidDate.getTime() > occurrence.dueDate.getTime();
    const daysLate = isLate
      ? Math.ceil(
          (paidDate.getTime() - occurrence.dueDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
    const simulatedInterestCalculation = daysLate * 2;

    return this.prisma.$transaction(async (tx): Promise<LogPaymentResult> => {
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          userId: occurrence.userId,
          occurrenceId: occurrence.id,
          obligationId: occurrence.obligationId,
          amountPaid,
          currency: occurrence.currency,
          paidDate,
          paymentStatus: isLate
            ? PaymentRecordStatus.LATE
            : PaymentRecordStatus.ON_TIME,
          daysLate,
          simulatedInterest: simulatedInterestCalculation,
          notes: dto.notes,
        },
      });

      // belowe we are updating the STTAUS of the Occurance:
      const updateOccurrence = await tx.paymentOccurrence.update({
        where: {
          id: occurrence.id,
        },
        data: {
          status: isLate
            ? PaymentOccurrenceStatus.PAID_LATE
            : PaymentOccurrenceStatus.PAID,
          paidAt: paidDate,
        },
      });

      const paymentEvent = await tx.userEvent.create({
        data: {
          userId,
          eventType: isLate
            ? UserEventType.PAYMENT_LATE
            : UserEventType.PAYMENT_ON_TIME,
          sourceType: UserEventSourceType.PAYMENT_RECORD,
          sourceId: paymentRecord.id,
          metadata: {
            occurrenceId: occurrence.id,
            obligationId: occurrence.obligationId,
            daysLate,
          },
        },
      });

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
      const scoreDelta = isLate ? LATE_SCORE_DELTA : ON_TIME_SCORE_DELTA;
      const scoreAfter = clampScore(scoreBefore + scoreDelta);
      const tierBefore = creditProfile.scoreTier;
      const tierAfter = resolveScoreTier(scoreAfter);

      await tx.creditProfile.update({
        where: { id: creditProfile.id },
        data: {
          previousScore: scoreBefore,
          currentScore: scoreAfter,
          scoreTier: tierAfter,
          lastCalculatedAt: new Date(),
          onTimePaymentCount: isLate
            ? creditProfile.onTimePaymentCount
            : creditProfile.onTimePaymentCount + 1,
          latePaymentCount: isLate
            ? creditProfile.latePaymentCount + 1
            : creditProfile.latePaymentCount,
        },
      });

      const scoreEvent = await tx.scoreEvent.create({
        data: {
          userId,
          creditProfileId: creditProfile.id,
          occurrenceId: occurrence.id,
          paymentRecordId: paymentRecord.id,
          eventType: isLate
            ? ScoreEventType.PAYMENT_LATE
            : ScoreEventType.PAYMENT_ON_TIME,
          pointsDelta: scoreDelta,
          scoreBefore,
          scoreAfter,
          explanation: isLate
            ? `Paid ${occurrence.obligation.name} ${daysLate} day${daysLate === 1 ? '' : 's'} late.`
            : `Paid ${occurrence.obligation.name} on time.`,
          calculationMetadata: {
            daysLate,
            simulatedInterest: simulatedInterestCalculation,
          },
        },
      });

      const gamificationProfile = await tx.gamificationProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const coinsAwarded = isLate ? 0 : ON_TIME_COINS;
      const xpAwarded = isLate ? 0 : ON_TIME_XP;
      const currentPaymentStreak = isLate
        ? 0
        : gamificationProfile.currentPaymentStreak + 1;
      const longestPaymentStreak = Math.max(
        gamificationProfile.longestPaymentStreak,
        currentPaymentStreak,
      );
      const coinBalance = gamificationProfile.coinBalance + coinsAwarded;
      const xp = gamificationProfile.xp + xpAwarded;

      await tx.gamificationProfile.update({
        where: { id: gamificationProfile.id },
        data: {
          coinBalance,
          xp,
          currentPaymentStreak,
          longestPaymentStreak,
          mascotMood: isLate ? MascotMood.STRESSED : MascotMood.HAPPY,
        },
      });

      if (coinsAwarded > 0) {
        await tx.rewardTransaction.create({
          data: {
            userId,
            sourceEventId: paymentEvent.id,
            type: RewardTransactionType.EARNED,
            amount: coinsAwarded,
            balanceAfter: coinBalance,
            reason: 'On-time payment reward',
          },
        });
      }

      return {
        message: 'Success. Users payment has been logged',
        payment: {
          id: paymentRecord.id,
          occurrenceId: paymentRecord.occurrenceId,
          obligationId: paymentRecord.obligationId,
          amountPaid: Number(paymentRecord.amountPaid),
          currency: paymentRecord.currency,
          paidDate: paymentRecord.paidDate,
          paymentStatus: paymentRecord.paymentStatus,
          daysLate: paymentRecord.daysLate,
          simulatedInterest: Number(paymentRecord.simulatedInterest),
          notes: paymentRecord.notes,
        },
        occurrence: {
          id: updateOccurrence.id,
          status: updateOccurrence.status,
          paidAt: updateOccurrence.paidAt,
        },
        scoreImpact: {
          scoreEventId: scoreEvent.id,
          previousScore: scoreBefore,
          currentScore: scoreAfter,
          delta: scoreDelta,
          tierBefore,
          tierAfter,
          explanation: scoreEvent.explanation,
        },
        rewards: {
          coinsAwarded,
          xpAwarded,
          coinBalance,
          xp,
          currentPaymentStreak,
          longestPaymentStreak,
          mascotMood: isLate ? MascotMood.STRESSED : MascotMood.HAPPY,
          badgesEarned: [],
        },
        paymentImpact: {
          isLate,
          daysLate,
          simulatedInterest: simulatedInterestCalculation,
        },
      };
    });
  }
}

function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

function resolveScoreTier(score: number): ScoreTier {
  if (score >= 800) return ScoreTier.ELITE;
  if (score >= 700) return ScoreTier.EXCELLENT;
  if (score >= 600) return ScoreTier.GOOD;
  if (score >= 500) return ScoreTier.FAIR;
  return ScoreTier.BUILDING;
}

/**
 * Test cases
 * 1. Successeful test case where user is making a payment for an existing financial oblication
 * 2. The occuranceId doe snot exist
 * 3. The user is trting to make a payment, but the Record already Exists in 'Payment Record'
 */
