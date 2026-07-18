import { QuizTopic } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { QuizService } from './quiz.service';
import type { PrismaService } from '../prisma/prisma.service';

type MockUser = {
  id: string;
  gamificationProfile: {
    currentKnowledgeStreak: number;
    longestKnowledgeStreak: number;
  };
};

const authUser: AuthUser = {
  supabaseAuthId: 'supabase-user-id',
  email: 'user@example.com',
};

describe('QuizService', () => {
  let service: QuizService;
  let prisma: {
    quizQuestion: {
      count: jest.Mock<Promise<number>, [Prisma.QuizQuestionCountArgs]>;
    };
    quizSession: {
      findFirst: jest.Mock<Promise<unknown>, [Prisma.QuizSessionFindFirstArgs]>;
    };
  };
  let usersService: {
    findOrCreateUser: jest.Mock<Promise<MockUser>, [AuthUser]>;
  };

  beforeEach(() => {
    prisma = {
      quizQuestion: {
        count: jest
          .fn<Promise<number>, [Prisma.QuizQuestionCountArgs]>()
          .mockResolvedValue(0),
      },
      quizSession: {
        findFirst: jest
          .fn<Promise<unknown>, [Prisma.QuizSessionFindFirstArgs]>()
          .mockResolvedValue(null),
      },
    };

    usersService = {
      findOrCreateUser: jest
        .fn<Promise<MockUser>, [AuthUser]>()
        .mockResolvedValue({
          id: 'user-123',
          gamificationProfile: {
            currentKnowledgeStreak: 3,
            longestKnowledgeStreak: 7,
          },
        }),
    };

    service = new QuizService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  it('marks seeded active topics as available and others as unavailable', async () => {
    prisma.quizQuestion.count.mockImplementation(({ where }) =>
      Promise.resolve(where.topic === QuizTopic.CREDIT_SCORE ? 5 : 0),
    );

    const topics = await service.listTopics();
    const creditScore = topics.find(
      (topic) => topic.key === QuizTopic.CREDIT_SCORE,
    );
    const interest = topics.find((topic) => topic.key === QuizTopic.INTEREST);

    expect(creditScore).toMatchObject({
      key: QuizTopic.CREDIT_SCORE,
      available: true,
      questionCount: 5,
      rewardPreview: { xp: 20, coins: 10 },
    });
    expect(interest).toMatchObject({
      key: QuizTopic.INTEREST,
      available: false,
      questionCount: 0,
      rewardPreview: null,
    });
  });

  it('returns teaching content for an available topic', async () => {
    prisma.quizQuestion.count.mockResolvedValue(5);

    const topic = await service.getTopic(QuizTopic.CREDIT_SCORE);

    expect(topic).toMatchObject({
      key: QuizTopic.CREDIT_SCORE,
      available: true,
      questionCount: 5,
    });
    expect(typeof topic.teachingContent.title).toBe('string');
    expect(typeof topic.teachingContent.body).toBe('string');
    expect(Array.isArray(topic.teachingContent.keyPoints)).toBe(true);
  });

  it('throws 404 when a topic has no active seeded questions', async () => {
    try {
      await service.getTopic(QuizTopic.INTEREST);
      throw new Error('Expected getTopic to throw');
    } catch (error) {
      const exception = error as {
        response: {
          statusCode: number;
          message: string;
        };
        getStatus: () => number;
      };

      expect(exception).toMatchObject({
        response: {
          statusCode: 404,
          message: 'Quiz topic is not available',
        },
      });
      expect(exception.getStatus()).toBe(404);
    }
  });

  it('returns an available state when today has no daily session', async () => {
    const result = await service.getDaily(
      authUser,
      new Date('2026-07-13T10:00:00.000Z'),
    );

    expect(result).toEqual({
      date: '2026-07-13',
      status: 'AVAILABLE',
      session: null,
      rewardPreview: { xp: 50, coins: 25 },
      knowledgeStreak: { current: 3, longest: 7 },
    });
    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(prisma.quizSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-123',
          type: 'DAILY',
          quizDate: {
            gte: new Date('2026-07-12T22:00:00.000Z'),
            lt: new Date('2026-07-13T22:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('returns an in-progress state with calculated queue progress', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'session-123',
      type: 'DAILY',
      status: 'IN_PROGRESS',
      score: 2,
      totalQuestions: 5,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: null,
      coinsAwarded: 0,
      xpAwarded: 0,
      answers: [{ isCorrect: true }, { isCorrect: false }, { isCorrect: true }],
    });

    await expect(
      service.getDaily(authUser, new Date('2026-07-13T10:00:00.000Z')),
    ).resolves.toMatchObject({
      date: '2026-07-13',
      status: 'IN_PROGRESS',
      session: {
        id: 'session-123',
        type: 'DAILY',
        status: 'IN_PROGRESS',
        progress: {
          correct: 2,
          answeredAttempts: 3,
          initialQuestions: 5,
          remainingQueue: 3,
        },
      },
      rewardPreview: { xp: 50, coins: 25 },
    });
  });

  it('returns a completed state with the settled reward', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'session-123',
      type: 'DAILY',
      status: 'COMPLETED',
      score: 5,
      totalQuestions: 5,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: new Date('2026-07-13T08:12:00.000Z'),
      coinsAwarded: 25,
      xpAwarded: 50,
      answers: [],
    });

    await expect(
      service.getDaily(authUser, new Date('2026-07-13T10:00:00.000Z')),
    ).resolves.toMatchObject({
      date: '2026-07-13',
      status: 'COMPLETED',
      session: {
        id: 'session-123',
        type: 'DAILY',
        status: 'COMPLETED',
        score: 5,
        totalQuestions: 5,
      },
      reward: { xp: 50, coins: 25 },
      knowledgeStreak: { current: 3, longest: 7 },
    });
  });
});
