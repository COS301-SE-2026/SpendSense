jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { QuizTopic } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

describe('QuizController', () => {
  let controller: QuizController;
  let quizService: jest.Mocked<
    Pick<QuizService, 'getDaily' | 'listTopics' | 'getTopic'>
  >;

  beforeEach(() => {
    quizService = {
      getDaily: jest.fn(),
      listTopics: jest.fn(),
      getTopic: jest.fn(),
    };

    controller = new QuizController(quizService as unknown as QuizService);
  });

  it('passes the authenticated user to the daily-state service', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-id',
      email: 'user@example.com',
    };
    const dailyState = {
      date: '2026-07-13',
      status: 'AVAILABLE',
      session: null,
      rewardPreview: { xp: 50, coins: 25 },
      knowledgeStreak: { current: 0, longest: 0 },
    };
    quizService.getDaily.mockResolvedValue(dailyState as never);

    await expect(controller.getDaily(authUser)).resolves.toEqual(dailyState);
    expect(quizService.getDaily).toHaveBeenCalledWith(authUser);
  });

  it('returns topics from the service', async () => {
    const topics = [
      {
        key: QuizTopic.CREDIT_SCORE,
        name: 'Credit Score',
        description: 'Learn about credit scores.',
        available: true,
        questionCount: 5,
        rewardPreview: { xp: 20, coins: 10 },
      },
    ];
    quizService.listTopics.mockResolvedValue(topics);

    await expect(controller.listTopics()).resolves.toEqual(topics);
    expect(quizService.listTopics).toHaveBeenCalledWith();
  });

  it('normalises a topic route parameter before calling the service', async () => {
    const topic = { key: QuizTopic.CREDIT_SCORE };
    quizService.getTopic.mockResolvedValue(topic as never);

    await expect(controller.getTopic('credit_score')).resolves.toEqual(topic);
    expect(quizService.getTopic).toHaveBeenCalledWith(QuizTopic.CREDIT_SCORE);
  });

  it('returns 404 for an invalid topic route parameter', async () => {
    await expect(controller.getTopic('not-a-topic')).rejects.toMatchObject({
      response: {
        statusCode: 404,
        message: 'Quiz topic is not available',
      },
    });
    expect(quizService.getTopic).not.toHaveBeenCalled();
  });
});
