import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
