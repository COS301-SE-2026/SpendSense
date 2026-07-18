import { QuizTopic } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { QuizService } from './quiz.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: {
    quizQuestion: {
      count: jest.Mock<Promise<number>, [Prisma.QuizQuestionCountArgs]>;
    };
  };

  beforeEach(() => {
    prisma = {
      quizQuestion: {
        count: jest
          .fn<Promise<number>, [Prisma.QuizQuestionCountArgs]>()
          .mockResolvedValue(0),
      },
    };

    service = new QuizService(prisma as unknown as PrismaService);
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
});
