import { Injectable, NotFoundException } from '@nestjs/common';
import { QuizSessionStatus, QuizSessionType, QuizTopic } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  QUIZ_DAILY_REWARD_PREVIEW,
  QUIZ_TOPIC_METADATA,
  QUIZ_TOPIC_REWARD_PREVIEW,
} from './quiz-topics';

const QUIZ_TIME_ZONE = 'Africa/Johannesburg';

type DailyDateRange = {
  date: string;
  start: Date;
  end: Date;
};

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async listTopics() {
    const topics = Object.values(QuizTopic);
    const counts = await Promise.all(
      topics.map((topic) =>
        this.prisma.quizQuestion.count({
          where: { topic, isActive: true },
        }),
      ),
    );

    return topics.map((topic, index) => {
      const questionCount = counts[index];
      const metadata = QUIZ_TOPIC_METADATA[topic];

      return {
        key: topic,
        name: metadata.name,
        description: metadata.description,
        available: questionCount > 0,
        questionCount,
        rewardPreview: questionCount > 0 ? QUIZ_TOPIC_REWARD_PREVIEW : null,
      };
    });
  }

  async getTopic(topic: QuizTopic) {
    const questionCount = await this.prisma.quizQuestion.count({
      where: { topic, isActive: true },
    });

    if (questionCount === 0) {
      throw new NotFoundException('Quiz topic is not available');
    }

    const metadata = QUIZ_TOPIC_METADATA[topic];

    return {
      key: topic,
      name: metadata.name,
      description: metadata.description,
      teachingContent: metadata.teachingContent,
      available: true,
      questionCount,
    };
  }

  async getDaily(authUser: AuthUser, now = new Date()) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const dateRange = this.getJohannesburgDateRange(now);
    const session = await this.prisma.quizSession.findFirst({
      where: {
        userId: user.id,
        type: QuizSessionType.DAILY,
        quizDate: {
          gte: dateRange.start,
          lt: dateRange.end,
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        completedAt: true,
        coinsAwarded: true,
        xpAwarded: true,
        answers: {
          select: {
            isCorrect: true,
          },
        },
      },
    });

    const knowledgeStreak = {
      current: user.gamificationProfile?.currentKnowledgeStreak ?? 0,
      longest: user.gamificationProfile?.longestKnowledgeStreak ?? 0,
    };

    if (!session) {
      return {
        date: dateRange.date,
        status: 'AVAILABLE' as const,
        session: null,
        rewardPreview: QUIZ_DAILY_REWARD_PREVIEW,
        knowledgeStreak,
      };
    }

    if (session.status === QuizSessionStatus.COMPLETED) {
      return {
        date: dateRange.date,
        status: 'COMPLETED' as const,
        session: {
          id: session.id,
          type: session.type,
          status: session.status,
          score: session.score,
          totalQuestions: session.totalQuestions,
          completedAt: session.completedAt,
        },
        reward: {
          xp: session.xpAwarded,
          coins: session.coinsAwarded,
        },
        knowledgeStreak,
      };
    }

    const answeredAttempts = session.answers.length;
    const correct = session.answers.filter((answer) => answer.isCorrect).length;

    return {
      date: dateRange.date,
      status: 'IN_PROGRESS' as const,
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        progress: {
          correct,
          answeredAttempts,
          initialQuestions: session.totalQuestions,
          remainingQueue: Math.max(session.totalQuestions - correct, 0),
        },
      },
      rewardPreview: QUIZ_DAILY_REWARD_PREVIEW,
      knowledgeStreak,
    };
  }

  private getJohannesburgDateRange(now: Date): DailyDateRange {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: QUIZ_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const date = `${values.year}-${values.month}-${values.day}`;
    const start = new Date(`${date}T00:00:00+02:00`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { date, start, end };
  }
}
