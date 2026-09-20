import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { GuidanceWalkthroughStatus, QuizSessionType } from '@prisma/client';
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

@Injectable()
export class GuidanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private validateUpdate(dto: UpdateGuidanceStateDto): void {
    if (Object.keys(dto).length === 0) {
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

  async getDailyFacts(authUser: AuthUser, now = new Date()) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const dateRange = this.getJohannesburgDateRange(now);

    const [dailyQuiz, gamificationProfile] = await Promise.all([
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
    ]);

    return {
      date: dateRange.date,
      // TODO: replace payments below with the payment contribution facts (once the actual partial payment schema changes have been added)
      payments: null,
      quiz: dailyQuiz
        ? {
            id: dailyQuiz.id,
            status: dailyQuiz.status,
            score: dailyQuiz.score,
            totalQuestions: dailyQuiz.totalQuestions,
            startedAt: dailyQuiz.startedAt,
            completedAt: dailyQuiz.completedAt,
            coinsAwarded: dailyQuiz.coinsAwarded,
            xpAwarded: dailyQuiz.xpAwarded,
          }
        : null,
      streaks: {
        payment: gamificationProfile?.currentPaymentStreak ?? 0,
        knowledge: gamificationProfile?.currentKnowledgeStreak ?? 0,
      },
    };
  }

  async getState(authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);

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
      dismissedTipIds: state.dismissedTipIds,
      updatedAt: state.updatedAt,
    };
  }

  async updateState(authUser: AuthUser, dto: UpdateGuidanceStateDto) {
    this.validateUpdate(dto);

    const user = await this.usersService.findOrCreateUser(authUser);

    const existingState = await this.prisma.guidanceState.findUnique({
      where: {
        userId: user.id,
      },
    });

    const storedDismissedTipIds = existingState?.dismissedTipIds;

    let dismissedTipIds: string[] = Array.isArray(storedDismissedTipIds)
      ? storedDismissedTipIds.filter(
          (tipId): tipId is string =>
            typeof tipId === 'string' &&
            DISMISSIBLE_GUIDANCE_TIP_ID_SET.has(tipId),
        )
      : [];

    dismissedTipIds = [...new Set(dismissedTipIds)].slice(
      0,
      MAX_DISMISSED_TIP_IDS,
    );

    if (dto.resetDismissedTips === true) {
      dismissedTipIds = [];
    }

    if (
      dto.dismissTipId !== undefined &&
      !dismissedTipIds.includes(dto.dismissTipId)
    ) {
      if (dismissedTipIds.length >= MAX_DISMISSED_TIP_IDS) {
        this.invalidGuidanceState(
          `A maximum of ${MAX_DISMISSED_TIP_IDS} guidance tips can be dismissed`,
        );
      }

      dismissedTipIds = [...dismissedTipIds, dto.dismissTipId];
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
        dismissedTipIds,
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
        dismissedTipIds,
      },
    });

    return {
      tipsEnabled: state.tipsEnabled,
      dailyExpansionEnabled: state.dailyExpansionEnabled,
      walkthrough: {
        status: state.walkthroughStatus,
        currentStep: state.walkthroughStep,
      },
      dismissedTipIds: state.dismissedTipIds,
      updatedAt: state.updatedAt,
    };
  }
}
