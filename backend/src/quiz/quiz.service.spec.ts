import { QuizSessionStatus, QuizSessionType, QuizTopic } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
import { QuizService } from './quiz.service';
import type { PrismaService } from '../prisma/prisma.service';

type MockUser = {
  id: string;
  gamificationProfile: {
    currentKnowledgeStreak: number;
    longestKnowledgeStreak: number;
  };
};

type TransactionMockMethod = jest.Mock<Promise<unknown>, [unknown]>;

const transactionMockMethod = (): TransactionMockMethod =>
  jest.fn<Promise<unknown>, [unknown]>();

type QuizTransactionMock = {
  quizSession: {
    findFirst: TransactionMockMethod;
    update: TransactionMockMethod;
  };
  quizQuestion: {
    findMany: TransactionMockMethod;
    findUnique: TransactionMockMethod;
  };
  quizSessionAnswer: {
    create: TransactionMockMethod;
  };
  userEvent: {
    create: TransactionMockMethod;
  };
  gamificationProfile: {
    upsert: TransactionMockMethod;
    update: TransactionMockMethod;
  };
  rewardTransaction: {
    create: TransactionMockMethod;
  };
};

type QuizTransactionCallback = (tx: QuizTransactionMock) => Promise<unknown>;

const authUser: AuthUser = {
  supabaseAuthId: 'supabase-user-id',
  email: 'user@example.com',
};

describe('QuizService', () => {
  let service: QuizService;
  let prisma: {
    quizQuestion: {
      count: jest.Mock<Promise<number>, [Prisma.QuizQuestionCountArgs]>;
      findMany: jest.Mock<
        Promise<unknown[]>,
        [Prisma.QuizQuestionFindManyArgs]
      >;
    };
    quizSession: {
      findFirst: jest.Mock<Promise<unknown>, [Prisma.QuizSessionFindFirstArgs]>;
      create: jest.Mock<Promise<unknown>, [Prisma.QuizSessionCreateArgs]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [QuizTransactionCallback]>;
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
        findMany: jest
          .fn<Promise<unknown[]>, [Prisma.QuizQuestionFindManyArgs]>()
          .mockResolvedValue([]),
      },
      quizSession: {
        findFirst: jest
          .fn<Promise<unknown>, [Prisma.QuizSessionFindFirstArgs]>()
          .mockResolvedValue(null),
        create: jest
          .fn<Promise<unknown>, [Prisma.QuizSessionCreateArgs]>()
          .mockResolvedValue(null),
      },
      $transaction: jest
        .fn<Promise<unknown>, [QuizTransactionCallback]>()
        .mockResolvedValue(null),
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

  it('creates a daily session with a mixed question pool and hides answers', async () => {
    prisma.quizQuestion.findMany.mockResolvedValue([
      {
        id: 'budgeting-1',
        topic: QuizTopic.BUDGETING,
        prompt: 'Budget question',
        options: [{ key: 'A', text: 'Plan spending' }],
      },
      {
        id: 'credit-1',
        topic: QuizTopic.CREDIT_SCORE,
        prompt: 'Credit question',
        options: [
          { key: 'A', text: 'Pay on time' },
          { key: 'B', text: 'Ignore due dates' },
        ],
      },
      {
        id: 'budgeting-2',
        topic: QuizTopic.BUDGETING,
        prompt: 'Second budget question',
        options: [{ key: 'A', text: 'Track spending' }],
      },
      {
        id: 'credit-2',
        topic: QuizTopic.CREDIT_SCORE,
        prompt: 'Second credit question',
        options: [{ key: 'A', text: 'Check reports' }],
      },
      {
        id: 'budgeting-3',
        topic: QuizTopic.BUDGETING,
        prompt: 'Third budget question',
        options: [{ key: 'A', text: 'Leave room' }],
      },
      {
        id: 'credit-3',
        topic: QuizTopic.CREDIT_SCORE,
        prompt: 'Third credit question',
        options: [{ key: 'A', text: 'Pay obligations' }],
      },
    ]);
    prisma.quizSession.create.mockResolvedValue({
      id: 'session-123',
      type: QuizSessionType.DAILY,
      topic: null,
      status: QuizSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: null,
      score: 0,
      totalQuestions: 5,
      coinsAwarded: 0,
      xpAwarded: 0,
      answers: [],
    });

    const result = await service.createOrResumeSession(
      authUser,
      { type: QuizSessionType.DAILY } satisfies CreateQuizSessionDto,
      new Date('2026-07-13T10:00:00.000Z'),
    );

    expect(result).toMatchObject({
      id: 'session-123',
      type: QuizSessionType.DAILY,
      status: QuizSessionStatus.IN_PROGRESS,
      progress: {
        correct: 0,
        answeredAttempts: 0,
        initialQuestions: 5,
        remainingQueue: 5,
      },
      currentQuestion: {
        id: 'budgeting-1',
        topic: QuizTopic.BUDGETING,
      },
      rewardPreview: { xp: 50, coins: 25 },
    });
    expect(result.currentQuestion).not.toHaveProperty('correctOptionKey');
    expect(prisma.quizSession.create).toHaveBeenCalled();
  });

  it('resumes an existing active topic session instead of creating another', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'topic-session-123',
      type: QuizSessionType.TOPIC,
      topic: QuizTopic.CREDIT_SCORE,
      status: QuizSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: null,
      score: 0,
      totalQuestions: 5,
      coinsAwarded: 0,
      xpAwarded: 0,
      answers: [],
    });
    prisma.quizQuestion.findMany.mockResolvedValue([
      {
        id: 'credit-1',
        topic: QuizTopic.CREDIT_SCORE,
        prompt: 'Credit question',
        options: [{ key: 'A', text: 'Pay on time' }],
      },
    ]);

    const result = await service.createOrResumeSession(authUser, {
      type: QuizSessionType.TOPIC,
      topic: QuizTopic.CREDIT_SCORE,
    });

    expect(result.id).toBe('topic-session-123');
    expect(prisma.quizSession.create).not.toHaveBeenCalled();
  });

  it('rejects a completed daily session for the current date', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'completed-daily',
      type: QuizSessionType.DAILY,
      topic: null,
      status: QuizSessionStatus.COMPLETED,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: new Date('2026-07-13T08:10:00.000Z'),
      score: 5,
      totalQuestions: 5,
      coinsAwarded: 25,
      xpAwarded: 50,
      answers: [],
    });

    await expect(
      service.createOrResumeSession(
        authUser,
        { type: QuizSessionType.DAILY },
        new Date('2026-07-13T10:00:00.000Z'),
      ),
    ).rejects.toMatchObject({
      response: {
        statusCode: 409,
        message: 'The daily quiz is already completed today',
      },
    });
  });

  it('returns an owned session with its current question', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'session-123',
      type: QuizSessionType.TOPIC,
      topic: QuizTopic.CREDIT_SCORE,
      status: QuizSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: null,
      score: 0,
      totalQuestions: 1,
      coinsAwarded: 0,
      xpAwarded: 0,
      answers: [],
    });
    prisma.quizQuestion.findMany.mockResolvedValue([
      {
        id: 'credit-1',
        topic: QuizTopic.CREDIT_SCORE,
        prompt: 'Credit question',
        options: [{ key: 'A', text: 'Pay on time' }],
      },
    ]);

    const result = await service.getSession(authUser, 'session-123');

    expect(result).toMatchObject({
      id: 'session-123',
      type: QuizSessionType.TOPIC,
      topic: QuizTopic.CREDIT_SCORE,
      currentQuestion: {
        id: 'credit-1',
        topic: QuizTopic.CREDIT_SCORE,
      },
      result: null,
    });
    expect(result.currentQuestion).not.toHaveProperty('correctOptionKey');
    expect(prisma.quizSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-123', userId: 'user-123' },
      }),
    );
  });

  it('returns 404 when a session is not owned by the authenticated user', async () => {
    await expect(
      service.getSession(authUser, 'other-user-session'),
    ).rejects.toMatchObject({
      response: {
        statusCode: 404,
        message: 'Quiz session not found',
      },
    });
    expect(prisma.quizQuestion.findMany).not.toHaveBeenCalled();
  });

  it('returns a result for a completed session', async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'completed-session',
      type: QuizSessionType.DAILY,
      topic: null,
      status: QuizSessionStatus.COMPLETED,
      startedAt: new Date('2026-07-13T08:00:00.000Z'),
      completedAt: new Date('2026-07-13T08:10:00.000Z'),
      score: 5,
      totalQuestions: 5,
      coinsAwarded: 25,
      xpAwarded: 50,
      answers: [
        { questionId: 'question-1', isCorrect: true },
        { questionId: 'question-2', isCorrect: true },
      ],
    });

    await expect(
      service.getSession(authUser, 'completed-session'),
    ).resolves.toMatchObject({
      status: QuizSessionStatus.COMPLETED,
      result: {
        score: 5,
        totalQuestions: 5,
        answeredAttempts: 2,
        reward: { xp: 50, coins: 25 },
        knowledgeStreak: {
          previous: 2,
          current: 3,
          longest: 7,
          advanced: true,
        },
      },
    });
  });

  it('records an incorrect answer and requeues the question', async () => {
    const question = {
      id: '00000000-0000-4000-8000-000000000001',
      topic: QuizTopic.CREDIT_SCORE,
      prompt: 'Credit question',
      options: [
        { key: 'A', text: 'Pay on time' },
        { key: 'B', text: 'Ignore due dates' },
      ],
      correctOptionKey: 'A',
      explanation: 'Paying on time supports financial health.',
    };
    const tx: QuizTransactionMock = {
      quizSession: {
        findFirst: transactionMockMethod().mockResolvedValue({
          id: 'session-123',
          type: QuizSessionType.TOPIC,
          topic: QuizTopic.CREDIT_SCORE,
          status: QuizSessionStatus.IN_PROGRESS,
          startedAt: new Date('2026-07-13T08:00:00.000Z'),
          completedAt: null,
          score: 0,
          totalQuestions: 1,
          coinsAwarded: 0,
          xpAwarded: 0,
          answers: [],
        }),
        update: transactionMockMethod(),
      },
      quizQuestion: {
        findMany: transactionMockMethod().mockResolvedValue([question]),
        findUnique: transactionMockMethod().mockResolvedValue(question),
      },
      quizSessionAnswer: { create: transactionMockMethod() },
      userEvent: { create: transactionMockMethod() },
      gamificationProfile: {
        upsert: transactionMockMethod(),
        update: transactionMockMethod(),
      },
      rewardTransaction: { create: transactionMockMethod() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const result = await service.submitAnswer(authUser, 'session-123', {
      questionId: question.id,
      selectedOptionKey: 'B',
    });

    expect(result).toMatchObject({
      sessionId: 'session-123',
      status: QuizSessionStatus.IN_PROGRESS,
      feedback: {
        isCorrect: false,
        requeued: true,
      },
      progress: {
        correct: 0,
        answeredAttempts: 1,
        remainingQueue: 1,
      },
      nextQuestion: { id: question.id },
      result: null,
    });
    expect(tx.quizSessionAnswer.create).toHaveBeenCalled();
    expect(tx.quizSession.update).toHaveBeenCalledWith({
      where: { id: 'session-123' },
      data: { score: 0 },
    });
  });

  it('completes a daily session and settles rewards atomically', async () => {
    const question = {
      id: '00000000-0000-4000-8000-000000000001',
      topic: QuizTopic.CREDIT_SCORE,
      prompt: 'Credit question',
      options: [{ key: 'A', text: 'Pay on time' }],
      correctOptionKey: 'A',
      explanation: 'Paying on time supports financial health.',
    };
    const tx: QuizTransactionMock = {
      quizSession: {
        findFirst: transactionMockMethod().mockResolvedValue({
          id: 'session-123',
          type: QuizSessionType.DAILY,
          topic: null,
          status: QuizSessionStatus.IN_PROGRESS,
          startedAt: new Date('2026-07-13T08:00:00.000Z'),
          completedAt: null,
          score: 0,
          totalQuestions: 1,
          coinsAwarded: 0,
          xpAwarded: 0,
          answers: [],
        }),
        update: transactionMockMethod(),
      },
      quizQuestion: {
        findMany: transactionMockMethod().mockResolvedValue([question]),
        findUnique: transactionMockMethod().mockResolvedValue(question),
      },
      quizSessionAnswer: { create: transactionMockMethod() },
      userEvent: {
        create: transactionMockMethod().mockResolvedValue({ id: 'event-123' }),
      },
      gamificationProfile: {
        upsert: transactionMockMethod().mockResolvedValue({
          id: 'profile-123',
          coinBalance: 10,
          xp: 20,
          currentKnowledgeStreak: 2,
          longestKnowledgeStreak: 4,
        }),
        update: transactionMockMethod(),
      },
      rewardTransaction: { create: transactionMockMethod() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const result = await service.submitAnswer(authUser, 'session-123', {
      questionId: question.id,
      selectedOptionKey: 'A',
    });

    expect(result).toMatchObject({
      sessionId: 'session-123',
      status: QuizSessionStatus.COMPLETED,
      feedback: {
        isCorrect: true,
        requeued: false,
      },
      progress: {
        correct: 1,
        answeredAttempts: 1,
        remainingQueue: 0,
      },
      nextQuestion: null,
      result: {
        score: 1,
        totalQuestions: 1,
        reward: { xp: 50, coins: 25 },
        knowledgeStreak: {
          previous: 2,
          current: 3,
          longest: 4,
          advanced: true,
        },
      },
    });
    expect(tx.userEvent.create).toHaveBeenCalled();
    expect(tx.gamificationProfile.update).toHaveBeenCalled();
    expect(tx.rewardTransaction.create).toHaveBeenCalled();
    const updateCall = tx.quizSession.update.mock.calls[0]?.[0] as {
      data: {
        status: QuizSessionStatus;
        score: number;
        coinsAwarded: number;
        xpAwarded: number;
      };
    };
    expect(updateCall.data).toMatchObject({
      status: QuizSessionStatus.COMPLETED,
      score: 1,
      coinsAwarded: 25,
      xpAwarded: 50,
    });
  });
});
