import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { FriendRequestDirection } from './dto/list-friend-requests-query.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.friendRequest.create({
      data: { senderId, receiverId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
        createdAt: true,
      },
    });
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
      senderDisplayName: sender.displayName,
      receiverDisplayName: receiver.displayName,
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
        !friend ||
        !friend.creditProfile ||
        !friend.gamificationProfile
      ) {
        throw new NotFoundException('User not found');
      }

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

  private async getRequestForAction(
    requestId: string,
    userId: string,
    ownerField: 'senderId' | 'receiverId',
  ) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      select: { id: true, senderId: true, receiverId: true, status: true },
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
}
