import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FriendRequestStatus,
  NotificationType,
  Prisma,
  ScoreTier,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { FriendRequestDirection } from './dto/list-friend-requests-query.dto';
import type { LeaderboardMetric } from './dto/list-leaderboard-query.dto';

const leaderboardPageSize = 20;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async searchUsers(userId: string, query: string) {
    const [friendships, pendingRequests] = await this.prisma.$transaction([
      this.prisma.friendship.findMany({
        where: { userId },
        select: { friendId: true },
      }),
      this.prisma.friendRequest.findMany({
        where: {
          status: FriendRequestStatus.PENDING,
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true },
      }),
    ]);

    const excludedUserIds = new Set<string>([userId]);
    friendships.forEach(({ friendId }) => excludedUserIds.add(friendId));
    pendingRequests.forEach(({ senderId, receiverId }) => {
      excludedUserIds.add(senderId);
      excludedUserIds.add(receiverId);
    });

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { notIn: [...excludedUserIds] },
        OR: [
          { displayName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: 20,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }

  async createRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    const receiver = await this.prisma.user.findFirst({
      where: { id: receiverId, deletedAt: null },
      select: { id: true },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { displayName: true },
    });

    const [existingRequest, existingFriendship] =
      await this.prisma.$transaction([
        this.prisma.friendRequest.findFirst({
          where: {
            OR: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
            status: {
              in: [FriendRequestStatus.PENDING, FriendRequestStatus.ACCEPTED],
            },
          },
          select: { id: true },
        }),
        this.prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: senderId, friendId: receiverId },
              { userId: receiverId, friendId: senderId },
            ],
          },
          select: { id: true },
        }),
      ]);

    if (existingRequest || existingFriendship) {
      throw new BadRequestException(
        'A friend request or friendship already exists between these users',
      );
    }

    const request = await this.prisma.friendRequest.create({
      data: { senderId, receiverId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
        createdAt: true,
      },
    });

    await this.notificationsService.create({
      userId: receiverId,
      type: NotificationType.SYSTEM,
      title: 'New friend request',
      message: `${sender?.displayName ?? 'Someone'} sent you a friend request.`,
      sourceId: request.id,
    });

    return request;
  }

  async listRequests(userId: string, direction: FriendRequestDirection) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.PENDING,
        ...(direction === 'incoming'
          ? { receiverId: userId }
          : { senderId: userId }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
        createdAt: true,
        respondedAt: true,
        sender: { select: { displayName: true } },
        receiver: { select: { displayName: true } },
      },
    });

    return requests.map(({ sender, receiver, ...request }) => ({
      ...request,
      senderDisplayName: sender.displayName ?? 'Unknown user',
      receiverDisplayName: receiver.displayName ?? 'Unknown user',
    }));
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.getRequestForAction(
      requestId,
      userId,
      'receiverId',
    );

    return this.prisma.$transaction(async (tx) => {
      const respondedAt = new Date();
      const updated = await tx.friendRequest.updateMany({
        where: { id: request.id, status: FriendRequestStatus.PENDING },
        data: { status: FriendRequestStatus.ACCEPTED, respondedAt },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Friend request is no longer pending');
      }

      await tx.friendship.createMany({
        data: [
          { userId, friendId: request.senderId },
          { userId: request.senderId, friendId: userId },
        ],
        skipDuplicates: true,
      });

      const [friendship, friend] = await Promise.all([
        tx.friendship.findUnique({
          where: { userId_friendId: { userId, friendId: request.senderId } },
          select: { id: true },
        }),
        tx.user.findUnique({
          where: { id: request.senderId },
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            creditProfile: { select: { scoreTier: true } },
            gamificationProfile: { select: { currentPaymentStreak: true } },
            badges: {
              where: { earnedAt: { not: null } },
              select: { id: true },
            },
          },
        }),
      ]);

      if (
        !friendship ||
        !friend?.creditProfile ||
        !friend?.gamificationProfile
      ) {
        throw new NotFoundException('User not found');
      }

      await this.notificationsService.create(
        {
          userId: request.senderId,
          type: NotificationType.SYSTEM,
          title: 'Friend request accepted',
          message: `${request.receiver.displayName ?? 'A friend'} accepted your friend request.`,
          sourceId: request.id,
        },
        tx,
      );

      return {
        request: {
          id: request.id,
          status: FriendRequestStatus.ACCEPTED,
          respondedAt,
        },
        friendship: {
          friendshipId: friendship.id,
          friendId: friend.id,
          displayName: friend.displayName,
          avatarUrl: friend.avatarUrl,
          scoreTier: friend.creditProfile.scoreTier,
          currentPaymentStreak: friend.gamificationProfile.currentPaymentStreak,
          badgeCount: friend.badges.length,
        },
      };
    });
  }

  async declineRequest(userId: string, requestId: string) {
    const request = await this.getRequestForAction(
      requestId,
      userId,
      'receiverId',
    );
    const respondedAt = new Date();

    return this.updatePendingRequest(
      request.id,
      FriendRequestStatus.DECLINED,
      respondedAt,
    );
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.getRequestForAction(
      requestId,
      userId,
      'senderId',
    );

    await this.updatePendingRequest(request.id, FriendRequestStatus.CANCELLED);

    return { id: request.id, status: FriendRequestStatus.CANCELLED };
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        friend: { select: friendSummarySelect },
      },
    });

    return friendships.map(({ id, friend }) =>
      this.toFriendSummary(id, friend),
    );
  }

  async getFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } },
      select: {
        id: true,
        friend: { select: friendSummarySelect },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friend not found');
    }

    return this.toFriendSummary(friendship.id, friendship.friend);
  }

  async removeFriend(userId: string, friendId: string) {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.friendship.deleteMany({
        where: { userId, friendId },
      });

      if (removed.count !== 1) {
        throw new NotFoundException('Friend not found');
      }

      await tx.friendship.deleteMany({
        where: { userId: friendId, friendId: userId },
      });

      return { friendId, removed: true };
    });
  }

  async listLeaderboard(
    userId: string,
    metric: LeaderboardMetric,
    page: number,
  ) {
    const offset = (page - 1) * leaderboardPageSize;
    const [totalEntries, rows] = await Promise.all([
      this.prisma.user.count({
        where: {
          deletedAt: null,
          OR: [{ id: userId }, { friendOf: { some: { userId } } }],
        },
      }),
      this.getLeaderboardRows(userId, metric, offset),
    ]);

    return {
      entries: rows.map((row) => ({
        rank: Number(row.rank),
        userId: row.userId,
        displayName: row.displayName ?? 'SpendSense user',
        avatarUrl: row.avatarUrl,
        isSelf: row.userId === userId,
        value: Number(row.value),
      })),
      pagination: {
        page,
        pageSize: leaderboardPageSize,
        totalEntries,
        totalPages: Math.ceil(totalEntries / leaderboardPageSize),
      },
    };
  }

  private async getRequestForAction(
    requestId: string,
    userId: string,
    ownerField: 'senderId' | 'receiverId',
  ) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
        receiver: { select: { displayName: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    if (request[ownerField] !== userId) {
      throw new ForbiddenException('You cannot modify this friend request');
    }
    if (request.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('Friend request is no longer pending');
    }

    return request;
  }

  private async updatePendingRequest(
    requestId: string,
    status: FriendRequestStatus,
    respondedAt?: Date,
  ) {
    const updated = await this.prisma.friendRequest.updateMany({
      where: { id: requestId, status: FriendRequestStatus.PENDING },
      data: { status, ...(respondedAt ? { respondedAt } : {}) },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('Friend request is no longer pending');
    }

    return { id: requestId, status, ...(respondedAt ? { respondedAt } : {}) };
  }

  private toFriendSummary(friendshipId: string, friend: FriendSummaryUser) {
    return {
      friendshipId,
      friendId: friend.id,
      displayName: friend.displayName ?? 'SpendSense user',
      avatarUrl: friend.avatarUrl,
      scoreTier: friend.creditProfile?.scoreTier ?? ScoreTier.GOOD,
      currentPaymentStreak:
        friend.gamificationProfile?.currentPaymentStreak ?? 0,
      badgeCount: friend.badges.length,
    };
  }

  private getLeaderboardRows(
    userId: string,
    metric: LeaderboardMetric,
    offset: number,
  ) {
    const valueColumn = {
      xp: Prisma.raw('profile."xp"'),
      coins: Prisma.raw('profile."coinBalance"'),
      streak: Prisma.raw('profile."currentPaymentStreak"'),
    }[metric];

    return this.prisma.$queryRaw<LeaderboardRow[]>`
      WITH members AS (
        SELECT ${userId} AS "id"
        UNION
        SELECT "friendId" FROM "Friendship" WHERE "userId" = ${userId}
      ), ranked AS (
        SELECT
          user_record."id" AS "userId",
          user_record."displayName" AS "displayName",
          user_record."avatarUrl" AS "avatarUrl",
          ${valueColumn} AS "value",
          (RANK() OVER (ORDER BY ${valueColumn} DESC))::integer AS "rank"
        FROM members
        JOIN "User" AS user_record ON user_record."id" = members."id"
        JOIN "GamificationProfile" AS profile ON profile."userId" = user_record."id"
        WHERE user_record."deletedAt" IS NULL
      )
      SELECT "userId", "displayName", "avatarUrl", "value", "rank"
      FROM ranked
      ORDER BY "value" DESC, "displayName" ASC NULLS LAST, "userId" ASC
      OFFSET ${offset}
      LIMIT ${leaderboardPageSize}
    `;
  }
}

const friendSummarySelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  creditProfile: { select: { scoreTier: true } },
  gamificationProfile: { select: { currentPaymentStreak: true } },
  badges: { where: { earnedAt: { not: null } }, select: { id: true } },
} as const;

type FriendSummaryUser = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  creditProfile: { scoreTier: ScoreTier } | null;
  gamificationProfile: { currentPaymentStreak: number } | null;
  badges: { id: string }[];
};

type LeaderboardRow = {
  rank: number | bigint;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  value: number | bigint;
};
