import {
  Injectable,
  UnprocessableEntityException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GuidanceWalkthroughStatus,
  QuizSessionType,
  QuizSessionStatus,
  PaymentContributionState,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  GUIDANCE_WALKTHROUGH_MIN_STEP,
  GUIDANCE_WALKTHROUGH_MAX_STEP,
  DISMISSIBLE_GUIDANCE_TIP_ID_SET,
  MAX_DISMISSED_TIP_IDS,
} from './guidance.constants';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { UpdateGuidanceStateDto } from './dto/update-guidance-state.dto';

const GUIDANCE_TIME_ZONE = 'Africa/Johannesburg';

type GuidanceDateRange = {
  date: string;
  start: Date;
  end: Date;
};

type StoredDismissal = {
  id: string;
  date: string;
};

@Injectable()
export class GuidanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private validateUpdate(dto: UpdateGuidanceStateDto): void {
    if (Object.values(dto).every((value) => value === undefined)) {
      this.invalidGuidanceState('Guidance state cannot be empty');
    }

    if (
      dto.walkthrough?.currentStep !== undefined &&
      (!Number.isInteger(dto.walkthrough.currentStep) ||
        dto.walkthrough.currentStep < GUIDANCE_WALKTHROUGH_MIN_STEP ||
        dto.walkthrough.currentStep > GUIDANCE_WALKTHROUGH_MAX_STEP)
    ) {
      this.invalidGuidanceState('Walkthrough step must be between 0 and 4');
    }

    if (
      dto.replayWalkthrough === true &&
      dto.walkthrough?.currentStep !== undefined &&
      dto.walkthrough.currentStep !== 0
    ) {
      this.invalidGuidanceState(
        'Walkthrough replay cannot be combined with a nonzero step',
      );
    }

    if (
      dto.replayWalkthrough === true &&
      dto.walkthrough?.status !== undefined &&
      dto.walkthrough.status !== GuidanceWalkthroughStatus.IN_PROGRESS
    ) {
      this.invalidGuidanceState(
        'Walkthrough replay cannot be with a status that is conflicting',
      );
    }

    if (
      dto.dismissTipId !== undefined &&
      !DISMISSIBLE_GUIDANCE_TIP_ID_SET.has(dto.dismissTipId)
    ) {
      this.invalidGuidanceState('Unknown guidance tip id');
    }
  }

  private invalidGuidanceState(message: string) {
    throw new UnprocessableEntityException({
      code: 'INVALID_GUIDANCE_STATE',
      message,
      details: {},
    });
  }

  private getJohannesburgDateRange(now: Date): GuidanceDateRange {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: GUIDANCE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    const date = `${values.year}-${values.month}-${values.day}`;

    const start = new Date(`${date}T00:00:00+02:00`);

    const end = new Date(start);

    end.setUTCDate(end.getUTCDate() + 1);

    return {
      date,
      start,
      end,
    };
  }

  private todaysDismissals(
    stored: Prisma.JsonValue,
    date: string,
  ): StoredDismissal[] {
    if (!Array.isArray(stored)) return [];

    const dismissals: StoredDismissal[] = [];

    for (const entry of stored) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        continue;
      }
      const { id, date: dismissedOn } = entry as Record<string, unknown>;
      if (
        typeof id === 'string' &&
        dismissedOn === date &&
        DISMISSIBLE_GUIDANCE_TIP_ID_SET.has(id) &&
        !dismissals.some((dismissal) => dismissal.id === id)
      ) {
        dismissals.push({ id, date });
      }
    }

    return dismissals.slice(0, MAX_DISMISSED_TIP_IDS);
  }

  async getDailyFacts(authUser: AuthUser, now = new Date()) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const dateRange = this.getJohannesburgDateRange(now);

    try {
      const [dailyQuiz, gamificationProfile, paymentContributions] =
        await Promise.all([
          this.prisma.quizSession.findFirst({
            where: {
              userId: user.id,
              type: QuizSessionType.DAILY,
              quizDate: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            },
            orderBy: {
              startedAt: 'desc',
            },
            select: {
              id: true,
              status: true,
              score: true,
              totalQuestions: true,
              startedAt: true,
              completedAt: true,
              coinsAwarded: true,
              xpAwarded: true,
            },
          }),

          this.prisma.gamificationProfile.findUnique({
            where: {
              userId: user.id,
            },
            select: {
              currentPaymentStreak: true,
              currentKnowledgeStreak: true,
            },
          }),

          this.prisma.paymentContribution.findMany({
            where: {
              userId: user.id,
              state: PaymentContributionState.POSTED,
              createdAt: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            },
            select: {
              amount: true,
              currency: true,
              occurrenceId: true,
              occurrence: {
                select: {
                  status: true,
                },
              },
            },
          }),
        ]);

      const totalsByCurrency = new Map<string, number>();

      for (const contribution of paymentContributions) {
        const current = totalsByCurrency.get(contribution.currency) ?? 0;

        totalsByCurrency.set(
          contribution.currency,
          current + Number(contribution.amount),
        );
      }

      const paymentTotals = Array.from(totalsByCurrency.entries()).map(
        ([currency, amount]) => ({
          currency,
          amount: amount.toFixed(2),
        }),
      );

      const completedOccurrenceIds = new Set(
        paymentContributions
          .filter(
            (contribution) =>
              contribution.occurrence.status === 'PAID' ||
              contribution.occurrence.status === 'PAID_LATE',
          )
          .map((contribution) => contribution.occurrenceId),
      );

      return {
        localDate: dateRange.date,
        asOf: now.toISOString(),

        payments: {
          contributionCount: paymentContributions.length,
          completedOccurrenceCount: completedOccurrenceIds.size,
          totalsByCurrency: paymentTotals,
        },

        dailyQuiz:
          dailyQuiz && dailyQuiz.status !== QuizSessionStatus.ABANDONED
            ? {
                status: dailyQuiz.status,
                sessionId: dailyQuiz.id,
                canStart: false,
                canResume: dailyQuiz.status === QuizSessionStatus.IN_PROGRESS,
              }
            : {
                status: 'AVAILABLE' as const,
                sessionId: null,
                canStart: true,
                canResume: false,
              },

        streaks: {
          payment: gamificationProfile?.currentPaymentStreak ?? 0,
          knowledge: gamificationProfile?.currentKnowledgeStreak ?? 0,
        },
      };
    } catch {
      throw new ServiceUnavailableException(
        'Daily guidance facts are unavailable',
      );
    }
  }

  async getState(authUser: AuthUser, now = new Date()) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const { date } = this.getJohannesburgDateRange(now);

    const state = await this.prisma.guidanceState.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!state) {
      return {
        tipsEnabled: true,
        dailyExpansionEnabled: true,
        walkthrough: {
          status: GuidanceWalkthroughStatus.NOT_STARTED,
          currentStep: 0,
        },
        dismissedTipIds: [],
        updatedAt: null,
      };
    }

    return {
      tipsEnabled: state.tipsEnabled,
      dailyExpansionEnabled: state.dailyExpansionEnabled,
      walkthrough: {
        status: state.walkthroughStatus,
        currentStep: state.walkthroughStep,
      },
      dismissedTipIds: this.todaysDismissals(state.dismissedTipIds, date).map(
        (dismissal) => dismissal.id,
      ),
      updatedAt: state.updatedAt,
    };
  }

  async updateState(
    authUser: AuthUser,
    dto: UpdateGuidanceStateDto,
    now = new Date(),
  ) {
    this.validateUpdate(dto);

    const user = await this.usersService.findOrCreateUser(authUser);
    const { date } = this.getJohannesburgDateRange(now);

    const existingState = await this.prisma.guidanceState.findUnique({
      where: {
        userId: user.id,
      },
    });

    let dismissals = this.todaysDismissals(
      existingState?.dismissedTipIds ?? [],
      date,
    );

    if (dto.resetDismissedTips === true) {
      dismissals = [];
    }

    if (
      dto.dismissTipId !== undefined &&
      !dismissals.some((dismissal) => dismissal.id === dto.dismissTipId)
    ) {
      if (dismissals.length >= MAX_DISMISSED_TIP_IDS) {
        this.invalidGuidanceState(
          `A maximum of ${MAX_DISMISSED_TIP_IDS} guidance tips can be dismissed`,
        );
      }

      dismissals = [...dismissals, { id: dto.dismissTipId, date }];
    }

    let walkthroughStatus =
      existingState?.walkthroughStatus ?? GuidanceWalkthroughStatus.NOT_STARTED;

    let walkthroughStep = existingState?.walkthroughStep ?? 0;

    if (dto.walkthrough?.status !== undefined) {
      walkthroughStatus = dto.walkthrough.status;
    }

    if (dto.walkthrough?.currentStep !== undefined) {
      walkthroughStep = dto.walkthrough.currentStep;
    }

    if (dto.replayWalkthrough === true) {
      walkthroughStatus = GuidanceWalkthroughStatus.IN_PROGRESS;
      walkthroughStep = 0;
    }

    const state = await this.prisma.guidanceState.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        tipsEnabled: dto.tipsEnabled ?? true,
        dailyExpansionEnabled: dto.dailyExpansionEnabled ?? true,
        walkthroughStatus,
        walkthroughStep,
        dismissedTipIds: dismissals,
      },
      update: {
        ...(dto.tipsEnabled !== undefined && {
          tipsEnabled: dto.tipsEnabled,
        }),
        ...(dto.dailyExpansionEnabled !== undefined && {
          dailyExpansionEnabled: dto.dailyExpansionEnabled,
        }),
        walkthroughStatus,
        walkthroughStep,
        dismissedTipIds: dismissals,
      },
    });

    return {
      tipsEnabled: state.tipsEnabled,
      dailyExpansionEnabled: state.dailyExpansionEnabled,
      walkthrough: {
        status: state.walkthroughStatus,
        currentStep: state.walkthroughStep,
      },
      dismissedTipIds: dismissals.map((dismissal) => dismissal.id),
      updatedAt: state.updatedAt,
    };
  }
}
