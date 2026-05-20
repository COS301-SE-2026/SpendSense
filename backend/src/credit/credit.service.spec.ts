import { ScoreEventType, ScoreTier } from '@prisma/client';
import { CreditService } from './credit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';

describe('CreditService', () => {
  let service: CreditService;
  let prisma: {
    creditProfile: {
      create: jest.Mock;
    };
    scoreEvent: {
      findMany: jest.Mock;
    };
  };
  let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

  const authUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  };

  beforeEach(() => {
    prisma = {
      creditProfile: {
        create: jest.fn(),
      },
      scoreEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    usersService = {
      findOrCreateUser: jest.fn(),
    };

    service = new CreditService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  it('returns the current user credit profile with integration contract field names', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      creditProfile: {
        currentScore: 712,
        previousScore: 704,
        scoreTier: ScoreTier.EXCELLENT,
        onTimePaymentCount: 8,
        latePaymentCount: 1,
        missedPaymentCount: 0,
        lastCalculatedAt: new Date('2026-05-20T10:00:00.000Z'),
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    await expect(service.getCreditProfile(authUser)).resolves.toEqual({
      currentScore: 712,
      previousScore: 704,
      scoreTier: ScoreTier.EXCELLENT,
      onTimeCount: 8,
      lateCount: 1,
      missedCount: 0,
      lastCalculatedAt: new Date('2026-05-20T10:00:00.000Z'),
    });
    expect(prisma.creditProfile.create).not.toHaveBeenCalled();
  });

  it('creates a default credit profile when an existing user is missing one', async () => {
    const createdProfile = {
      currentScore: 600,
      previousScore: 600,
      scoreTier: ScoreTier.GOOD,
      onTimePaymentCount: 0,
      latePaymentCount: 0,
      missedPaymentCount: 0,
      lastCalculatedAt: null,
    };

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      creditProfile: null,
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);
    prisma.creditProfile.create.mockResolvedValue(createdProfile);

    await expect(service.getCreditProfile(authUser)).resolves.toEqual({
      currentScore: 600,
      previousScore: 600,
      scoreTier: ScoreTier.GOOD,
      onTimeCount: 0,
      lateCount: 0,
      missedCount: 0,
      lastCalculatedAt: null,
    });
    expect(prisma.creditProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        currentScore: 600,
        previousScore: 600,
        scoreTier: ScoreTier.GOOD,
      },
      select: {
        currentScore: true,
        previousScore: true,
        scoreTier: true,
        onTimePaymentCount: true,
        latePaymentCount: true,
        missedPaymentCount: true,
        lastCalculatedAt: true,
      },
    });
  });

  it('returns the current user score event history ordered newest first', async () => {
    const createdAt = new Date('2026-05-20T10:00:00.000Z');
    const events = [
      {
        id: 'score-event-1',
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 704,
        scoreAfter: 712,
        explanation: 'Paid Subscription on time.',
        createdAt,
      },
    ];

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);
    prisma.scoreEvent.findMany.mockResolvedValue(events);

    await expect(service.getCreditProfileEvents(authUser)).resolves.toEqual(
      events,
    );
    expect(prisma.scoreEvent.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        eventType: true,
        pointsDelta: true,
        scoreBefore: true,
        scoreAfter: true,
        explanation: true,
        createdAt: true,
      },
    });
  });

  it('returns an empty score event history when the user has no events', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    await expect(service.getCreditProfileEvents(authUser)).resolves.toEqual([]);
  });
});
