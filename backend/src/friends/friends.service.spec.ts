import { FriendRequestStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from './friends.service';

describe('FriendsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    friendship: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    friendRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  const service = new FriendsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches public fields and excludes the caller, friends, and pending pairs', async () => {
    prisma.friendship.findMany.mockReturnValue(Promise.resolve([]));
    prisma.friendRequest.findMany.mockReturnValue(Promise.resolve([]));
    prisma.$transaction.mockResolvedValue([
      [{ friendId: 'friend-id' }],
      [
        { senderId: 'user-id', receiverId: 'outgoing-id' },
        { senderId: 'incoming-id', receiverId: 'user-id' },
      ],
    ]);
    prisma.user.findMany.mockResolvedValue([]);

    await service.searchUsers('user-id', 'kah');

    expect(prisma.friendRequest.findMany).toHaveBeenCalledWith({
      where: {
        status: FriendRequestStatus.PENDING,
        OR: [{ senderId: 'user-id' }, { receiverId: 'user-id' }],
      },
      select: { senderId: true, receiverId: true },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        id: {
          notIn: ['user-id', 'friend-id', 'outgoing-id', 'incoming-id'],
        },
        OR: [
          { displayName: { contains: 'kah', mode: 'insensitive' } },
          { email: { contains: 'kah', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: 20,
      select: { id: true, displayName: true, avatarUrl: true },
    });
  });

  it('creates a pending request for an active user without a request or friendship', async () => {
    const createdAt = new Date('2026-08-21T10:00:00.000Z');
    prisma.user.findFirst.mockResolvedValue({ id: 'receiver-id' });
    prisma.friendRequest.findFirst.mockReturnValue(Promise.resolve(null));
    prisma.friendship.findFirst.mockReturnValue(Promise.resolve(null));
    prisma.$transaction.mockResolvedValue([null, null]);
    prisma.friendRequest.create.mockResolvedValue({
      id: 'request-id',
      senderId: 'sender-id',
      receiverId: 'receiver-id',
      status: FriendRequestStatus.PENDING,
      createdAt,
    });

    await expect(
      service.createRequest('sender-id', 'receiver-id'),
    ).resolves.toMatchObject({
      id: 'request-id',
      status: FriendRequestStatus.PENDING,
    });
  });

  it('rejects self requests and unknown receivers', async () => {
    await expect(
      service.createRequest('user-id', 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.createRequest('sender-id', 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only pending incoming requests with both public display names', async () => {
    const createdAt = new Date('2026-08-21T10:00:00.000Z');
    prisma.friendRequest.findMany.mockResolvedValue([
      {
        id: 'request-id',
        senderId: 'sender-id',
        receiverId: 'receiver-id',
        status: FriendRequestStatus.PENDING,
        createdAt,
        respondedAt: null,
        sender: { displayName: 'Sender' },
        receiver: { displayName: 'Receiver' },
      },
    ]);

    await expect(
      service.listRequests('receiver-id', 'incoming'),
    ).resolves.toEqual([
      {
        id: 'request-id',
        senderId: 'sender-id',
        receiverId: 'receiver-id',
        status: FriendRequestStatus.PENDING,
        createdAt,
        respondedAt: null,
        senderDisplayName: 'Sender',
        receiverDisplayName: 'Receiver',
      },
    ]);
  });

  it('uses a safe display name when a request user has no profile name', async () => {
    prisma.friendRequest.findMany.mockResolvedValue([
      {
        id: 'request-id',
        senderId: 'sender-id',
        receiverId: 'receiver-id',
        status: FriendRequestStatus.PENDING,
        createdAt: new Date('2026-08-21T10:00:00.000Z'),
        respondedAt: null,
        sender: { displayName: null },
        receiver: { displayName: null },
      },
    ]);

    await expect(
      service.listRequests('receiver-id', 'incoming'),
    ).resolves.toMatchObject([
      {
        senderDisplayName: 'Unknown user',
        receiverDisplayName: 'Unknown user',
      },
    ]);
  });

  it('accepts a pending incoming request and creates both friendship directions', async () => {
    const transactionClient = {
      friendRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      friendship: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'friendship-id' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sender-id',
          displayName: 'Sender',
          avatarUrl: null,
          creditProfile: { scoreTier: 'GOOD' },
          gamificationProfile: { currentPaymentStreak: 3 },
          badges: [{ id: 'badge-id' }],
        }),
      },
    };
    prisma.friendRequest.findUnique.mockResolvedValue({
      id: 'request-id',
      senderId: 'sender-id',
      receiverId: 'receiver-id',
      status: FriendRequestStatus.PENDING,
    });
    prisma.$transaction.mockImplementation((operation: unknown) => {
      const callback = operation as (
        tx: typeof transactionClient,
      ) => Promise<unknown>;
      return callback(transactionClient);
    });

    await expect(
      service.acceptRequest('receiver-id', 'request-id'),
    ).resolves.toMatchObject({
      request: { id: 'request-id', status: FriendRequestStatus.ACCEPTED },
      friendship: {
        friendshipId: 'friendship-id',
        friendId: 'sender-id',
        badgeCount: 1,
      },
    });
    expect(transactionClient.friendship.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'receiver-id', friendId: 'sender-id' },
        { userId: 'sender-id', friendId: 'receiver-id' },
      ],
      skipDuplicates: true,
    });
  });

  it('declines incoming requests and cancels outgoing requests', async () => {
    prisma.friendRequest.findUnique
      .mockResolvedValueOnce({
        id: 'incoming-id',
        senderId: 'sender-id',
        receiverId: 'user-id',
        status: FriendRequestStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'outgoing-id',
        senderId: 'user-id',
        receiverId: 'receiver-id',
        status: FriendRequestStatus.PENDING,
      });
    prisma.friendRequest.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.declineRequest('user-id', 'incoming-id'),
    ).resolves.toMatchObject({
      id: 'incoming-id',
      status: FriendRequestStatus.DECLINED,
    });
    await expect(
      service.cancelRequest('user-id', 'outgoing-id'),
    ).resolves.toEqual({
      id: 'outgoing-id',
      status: FriendRequestStatus.CANCELLED,
    });
  });

  it('lists only privacy-safe friend summaries', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 'friendship-id',
        friend: {
          id: 'friend-id',
          displayName: 'Friend',
          avatarUrl: null,
          creditProfile: { scoreTier: 'EXCELLENT' },
          gamificationProfile: { currentPaymentStreak: 5 },
          badges: [{ id: 'badge-one' }, { id: 'badge-two' }],
        },
      },
    ]);

    await expect(service.listFriends('user-id')).resolves.toEqual([
      {
        friendshipId: 'friendship-id',
        friendId: 'friend-id',
        displayName: 'Friend',
        avatarUrl: null,
        scoreTier: 'EXCELLENT',
        currentPaymentStreak: 5,
        badgeCount: 2,
      },
    ]);
  });

  it('returns one current friend and hides non-friends', async () => {
    prisma.friendship.findUnique.mockResolvedValueOnce({
      id: 'friendship-id',
      friend: {
        id: 'friend-id',
        displayName: 'Friend',
        avatarUrl: null,
        creditProfile: { scoreTier: 'GOOD' },
        gamificationProfile: { currentPaymentStreak: 2 },
        badges: [],
      },
    });

    await expect(
      service.getFriend('user-id', 'friend-id'),
    ).resolves.toMatchObject({
      friendshipId: 'friendship-id',
      friendId: 'friend-id',
      scoreTier: 'GOOD',
    });

    prisma.friendship.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getFriend('user-id', 'not-a-friend-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes both directions of an existing friendship', async () => {
    const transactionClient = {
      friendship: {
        deleteMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation((operation: unknown) => {
      const callback = operation as (
        tx: typeof transactionClient,
      ) => Promise<unknown>;
      return callback(transactionClient);
    });

    await expect(service.removeFriend('user-id', 'friend-id')).resolves.toEqual(
      { friendId: 'friend-id', removed: true },
    );
    expect(transactionClient.friendship.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-id', friendId: 'friend-id' },
    });
    expect(transactionClient.friendship.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'friend-id', friendId: 'user-id' },
    });
  });

  it('does not reveal or remove a non-friend', async () => {
    const transactionClient = {
      friendship: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma.$transaction.mockImplementation((operation: unknown) => {
      const callback = operation as (
        tx: typeof transactionClient,
      ) => Promise<unknown>;
      return callback(transactionClient);
    });

    await expect(
      service.removeFriend('user-id', 'not-a-friend-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionClient.friendship.deleteMany).toHaveBeenCalledTimes(1);
  });
});
