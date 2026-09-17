import { Injectable } from '@nestjs/common';
import { GuidanceWalkthroughStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

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
}
