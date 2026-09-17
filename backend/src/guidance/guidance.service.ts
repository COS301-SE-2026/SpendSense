import { Injectable } from '@nestjs/common';
import { GuidanceWalkthroughStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { UpdateGuidanceStateDto } from './dto/update-guidance-state.dto';

@Injectable()
export class GuidanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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
    const user = await this.usersService.findOrCreateUser(authUser);

    const existingState = await this.prisma.guidanceState.findUnique({
      where: {
        userId: user.id,
      },
    });

    let dismissedTipIds = existingState?.dismissedTipIds ?? [];

    if (!Array.isArray(dismissedTipIds)) {
      dismissedTipIds = [];
    }

    if (dto.resetDismissedTips === true) {
      dismissedTipIds = [];
    }

    if (
      dto.dismissTipId !== undefined &&
      !dismissedTipIds.includes(dto.dismissTipId)
    ) {
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
