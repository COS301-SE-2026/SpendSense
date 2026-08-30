import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  WagerStatus,
  WagerTaskType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';
import { CreateWagerDto } from './dto/create-wager.dto';

@Injectable()
export class WagersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly rewardService: RewardService,
  ) {}
  async createWager(creatorId: string, dto: CreateWagerDto) {
    if (creatorId === dto.opponentId) {
      throw new BadRequestException(
        'You cannot create a wager against yourself',
      );
    }
    const opponent = await this.prisma.user.findFirst({
      where: {
        id: dto.opponentId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!opponent) {
      throw new NotFoundException('Opponent not found');
    }
    const [friendship, creator] = await this.prisma.$transaction([
      this.prisma.friendship.findUnique({
        where: {
          userId_friendId: {
            userId: creatorId,
            friendId: dto.opponentId,
          },
        },
        select: {
          id: true,
        },
      }),
      this.prisma.user.findUnique({
        where: {
          id: creatorId,
        },
        select: {
          id: true,
          displayName: true,
          gamificationProfile: {
            select: {
              coinBalance: true,
            },
          },
        },
      }),
    ]);
    if (!friendship) {
      throw new BadRequestException(
        'You can only create wagers with current friends',
      );
    }
    if (!creator?.gamificationProfile) {
      throw new NotFoundException('Creator profile not found');
    }
    if (dto.stakeAmount > creator.gamificationProfile.coinBalance) {
      throw new BadRequestException('Insufficient coin balance for this wager');
    }
    return this.prisma.$transaction(async (tx) => {
      const wager = await tx.wager.create({
        data: {
          creatorId,
          opponentId: dto.opponentId,
          taskType: dto.taskType,
          stakeAmount: dto.stakeAmount,
          durationDays: dto.durationDays,
        },
        select: wagerSummarySelect,
      });
      await this.notificationsService.create(
        {
          userId: dto.opponentId,
          type: NotificationType.WAGER_INVITE,
          title: 'New wager invite',
          message: `${creator.displayName ?? 'A friend'} invited you to a wager.`,
          sourceId: wager.id,
        },
        tx,
      );
      return {
        id: wager.id,
        creatorId: wager.creatorId,
        opponentId: wager.opponentId,
        taskType: wager.taskType,
        stakeAmount: wager.stakeAmount,
        status: wager.status,
        durationDays: wager.durationDays,
        invitedAt: wager.invitedAt,
        startDate: wager.startDate,
        endDate: wager.endDate,
        resolvedAt: wager.resolvedAt,
        creatorOutcome: wager.creatorOutcome,
        opponentOutcome: wager.opponentOutcome,
        isCreator: true,
      };
    });
  }
  async listWagers(userId: string, status?: WagerStatus) {
    const wagers = await this.prisma.wager.findMany({
      where: {
        OR: [{ creatorId: userId }, { opponentId: userId }],
        ...(status ? { status } : {}),
      },
      orderBy: {
        invitedAt: 'desc',
      },
      select: wagerSummarySelect,
    });
    return wagers.map((wager) => this.toWagerSummary(wager, userId));
  }
  async getWager(userId: string, wagerId: string) {
    const wager = await this.prisma.wager.findUnique({
      where: {
        id: wagerId,
      },
      select: wagerSummarySelect,
    });
    if (!wager) {
      throw new NotFoundException('Wager not found');
    }
    if (wager.creatorId !== userId && wager.opponentId !== userId) {
      throw new ForbiddenException('You cannot access this wager');
    }
    return this.toWagerSummary(wager, userId);
  }
  async acceptWager(userId: string, wagerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const wager = await tx.wager.findUnique({
        where: {
          id: wagerId,
        },
        select: {
          id: true,
          creatorId: true,
          opponentId: true,
          taskType: true,
          stakeAmount: true,
          status: true,
          durationDays: true,
        },
      });
      if (!wager) {
        throw new NotFoundException('Wager not found');
      }
      if (wager.opponentId !== userId) {
        throw new ForbiddenException(
          'Only the invited opponent can accept this wager',
        );
      }
      if (wager.status !== WagerStatus.PENDING) {
        throw new BadRequestException('Only a pending wager can be accepted');
      }
      let taskSnapshot: Prisma.InputJsonObject | undefined;
      if (wager.taskType === WagerTaskType.MAINTAIN_PAYMENT_STREAK) {
        const profiles = await tx.gamificationProfile.findMany({
          where: {
            userId: {
              in: [wager.creatorId, wager.opponentId],
            },
          },
          select: {
            userId: true,
            currentPaymentStreak: true,
          },
        });
        const creatorProfile = profiles.find(
          (profile) => profile.userId === wager.creatorId,
        );
        const opponentProfile = profiles.find(
          (profile) => profile.userId === wager.opponentId,
        );
        taskSnapshot = {
          creatorCurrentPaymentStreak:
            creatorProfile?.currentPaymentStreak ?? 0,
          opponentCurrentPaymentStreak:
            opponentProfile?.currentPaymentStreak ?? 0,
        };
      }
      const respondedAt = new Date();
      const startDate = respondedAt;
      const endDate = new Date(
        startDate.getTime() + wager.durationDays * 24 * 60 * 60 * 1000,
      );
      const activated = await tx.wager.updateMany({
        where: {
          id: wager.id,
          opponentId: userId,
          status: WagerStatus.PENDING,
        },
        data: {
          status: WagerStatus.ACTIVE,
          respondedAt,
          startDate,
          endDate,
          ...(taskSnapshot ? { taskSnapshot } : {}),
        },
      });
      if (activated.count === 0) {
        throw new BadRequestException('Wager is no longer pending');
      }
      await this.rewardService.spendCoins(tx, {
        userId: wager.creatorId,
        amount: wager.stakeAmount,
        reason: 'Wager stake',
      });
      const opponentSpend = await this.rewardService.spendCoins(tx, {
        userId: wager.opponentId,
        amount: wager.stakeAmount,
        reason: 'Wager stake',
      });
      return {
        id: wager.id,
        status: WagerStatus.ACTIVE,
        respondedAt,
        startDate,
        endDate,
        coinBalance: opponentSpend.coinBalance,
      };
    });
  }
  async declineWager(userId: string, wagerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const wager = await tx.wager.findUnique({
        where: {
          id: wagerId,
        },
        select: {
          id: true,
          opponentId: true,
          status: true,
        },
      });
      if (!wager) {
        throw new NotFoundException('Wager not found');
      }
      if (wager.opponentId !== userId) {
        throw new ForbiddenException(
          'Only the invited opponent can decline this wager',
        );
      }
      if (wager.status !== WagerStatus.PENDING) {
        throw new BadRequestException('Only a pending wager can be declined');
      }
      const respondedAt = new Date();
      const declined = await tx.wager.updateMany({
        where: {
          id: wager.id,
          opponentId: userId,
          status: WagerStatus.PENDING,
        },
        data: {
          status: WagerStatus.DECLINED,
          respondedAt,
        },
      });
      if (declined.count === 0) {
        throw new BadRequestException('Wager is no longer pending');
      }
      return {
        id: wager.id,
        status: WagerStatus.DECLINED,
      };
    });
  }
  async cancelWager(userId: string, wagerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const wager = await tx.wager.findUnique({
        where: {
          id: wagerId,
        },
        select: {
          id: true,
          creatorId: true,
          status: true,
        },
      });
      if (!wager) {
        throw new NotFoundException('Wager not found');
      }
      if (wager.creatorId !== userId) {
        throw new ForbiddenException('Only the creator can cancel this wager');
      }
      if (wager.status !== WagerStatus.PENDING) {
        throw new BadRequestException('Only a pending wager can be cancelled');
      }
      const cancelled = await tx.wager.updateMany({
        where: {
          id: wager.id,
          creatorId: userId,
          status: WagerStatus.PENDING,
        },
        data: {
          status: WagerStatus.CANCELLED,
        },
      });
      if (cancelled.count === 0) {
        throw new BadRequestException('Wager is no longer pending');
      }
      return {
        id: wager.id,
        status: WagerStatus.CANCELLED,
      };
    });
  }
  private toWagerSummary(wager: WagerSummaryRecord, userId: string) {
    return {
      id: wager.id,
      creatorId: wager.creatorId,
      creatorDisplayName: wager.creator.displayName ?? 'SpendSense user',
      opponentId: wager.opponentId,
      opponentDisplayName: wager.opponent.displayName ?? 'SpendSense user',
      taskType: wager.taskType,
      stakeAmount: wager.stakeAmount,
      status: wager.status,
      durationDays: wager.durationDays,
      invitedAt: wager.invitedAt,
      respondedAt: wager.respondedAt,
      startDate: wager.startDate,
      endDate: wager.endDate,
      resolvedAt: wager.resolvedAt,
      creatorOutcome: wager.creatorOutcome,
      opponentOutcome: wager.opponentOutcome,
      isCreator: wager.creatorId === userId,
    };
  }
}

const wagerSummarySelect = {
  id: true,
  creatorId: true,
  opponentId: true,
  taskType: true,
  stakeAmount: true,
  status: true,
  durationDays: true,
  invitedAt: true,
  respondedAt: true,
  startDate: true,
  endDate: true,
  resolvedAt: true,
  creatorOutcome: true,
  opponentOutcome: true,
  creator: {
    select: {
      displayName: true,
    },
  },
  opponent: {
    select: {
      displayName: true,
    },
  },
} as const;

type WagerSummaryRecord = Prisma.WagerGetPayload<{
  select: typeof wagerSummarySelect;
}>;
