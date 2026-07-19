import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuizSessionStatus, QuizSessionType, QuizTopic } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
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

  async createOrResumeSession(
    authUser: AuthUser,
    dto: CreateQuizSessionDto,
    now = new Date(),
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const dateRange = this.getJohannesburgDateRange(now);

    if (dto.type === QuizSessionType.TOPIC && !dto.topic) {
      throw new ConflictException('A topic is required for a topic quiz');
    }

    const existingSession = await this.findMatchingSession(
      user.id,
      dto,
      dateRange,
    );

    if (existingSession?.status === QuizSessionStatus.IN_PROGRESS) {
      const questions = await this.selectQuestionPool(dto);
      return this.toSessionResponse(existingSession, questions);
    }

    if (
      dto.type === QuizSessionType.DAILY &&
      existingSession?.status === QuizSessionStatus.COMPLETED
    ) {
      throw new ConflictException('The daily quiz is already completed today');
    }

    const questions = await this.selectQuestionPool(dto);

    if (questions.length === 0) {
      throw new NotFoundException('No active questions are available');
    }

    const session = await this.prisma.quizSession.create({
      data: {
        userId: user.id,
        type: dto.type,
        ...(dto.topic ? { topic: dto.topic } : {}),
        ...(dto.type === QuizSessionType.DAILY
          ? { quizDate: dateRange.start }
          : {}),
        totalQuestions: questions.length,
      },
      select: this.sessionSelect,
    });

    return this.toSessionResponse(session, questions);
  }

  async getSession(authUser: AuthUser, sessionId: string) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const session = await this.prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
      select: this.sessionSelect,
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const questions = await this.selectQuestionPool({
      type: session.type,
      ...(session.topic ? { topic: session.topic } : {}),
    });

    return this.toSessionResponse(session, questions);
  }

  private readonly sessionSelect = {
    id: true,
    type: true,
    topic: true,
    status: true,
    startedAt: true,
    completedAt: true,
    score: true,
    totalQuestions: true,
    coinsAwarded: true,
    xpAwarded: true,
    answers: {
      select: {
        questionId: true,
        isCorrect: true,
      },
    },
  } as const;

  private async findMatchingSession(
    userId: string,
    dto: CreateQuizSessionDto,
    dateRange: DailyDateRange,
  ) {
    return this.prisma.quizSession.findFirst({
      where: {
        userId,
        type: dto.type,
        ...(dto.type === QuizSessionType.DAILY
          ? {
              quizDate: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : { topic: dto.topic }),
      },
      orderBy: { startedAt: 'desc' },
      select: this.sessionSelect,
    });
  }

  private async selectQuestionPool(dto: CreateQuizSessionDto) {
    const questions = await this.prisma.quizQuestion.findMany({
      where: {
        isActive: true,
        ...(dto.type === QuizSessionType.TOPIC ? { topic: dto.topic } : {}),
      },
      orderBy: [{ topic: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        topic: true,
        prompt: true,
        options: true,
      },
    });

    if (dto.type === QuizSessionType.TOPIC) {
      return questions.slice(0, 5);
    }

    const questionsByTopic = new Map<QuizTopic, typeof questions>();
    for (const question of questions) {
      const topicQuestions = questionsByTopic.get(question.topic) ?? [];
      topicQuestions.push(question);
      questionsByTopic.set(question.topic, topicQuestions);
    }

    const selectedQuestions: typeof questions = [];
    const topicQueues = [...questionsByTopic.values()];
    let questionIndex = 0;

    while (
      selectedQuestions.length < 5 &&
      topicQueues.some(
        (topicQuestions) => questionIndex < topicQuestions.length,
      )
    ) {
      for (const topicQuestions of topicQueues) {
        const question = topicQuestions[questionIndex];

        if (question && selectedQuestions.length < 5) {
          selectedQuestions.push(question);
        }
      }

      questionIndex += 1;
    }

    return selectedQuestions;
  }

  private toSessionResponse(
    session: {
      id: string;
      type: QuizSessionType;
      topic: QuizTopic | null;
      status: QuizSessionStatus;
      startedAt: Date;
      completedAt: Date | null;
      score: number;
      totalQuestions: number;
      coinsAwarded: number;
      xpAwarded: number;
      answers: { questionId: string; isCorrect: boolean }[];
    },
    questions?: {
      id: string;
      topic: QuizTopic;
      prompt: string;
      options: unknown;
    }[],
  ) {
    const currentQuestion = questions?.find(
      (question) =>
        !session.answers.some(
          (answer) => answer.questionId === question.id && answer.isCorrect,
        ),
    );

    const correct = session.answers.filter((answer) => answer.isCorrect).length;

    return {
      id: session.id,
      type: session.type,
      topic: session.topic,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      progress: {
        correct,
        answeredAttempts: session.answers.length,
        initialQuestions: session.totalQuestions,
        remainingQueue: Math.max(session.totalQuestions - correct, 0),
      },
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            topic: currentQuestion.topic,
            prompt: currentQuestion.prompt,
            options: currentQuestion.options,
          }
        : null,
      rewardPreview:
        session.type === QuizSessionType.DAILY
          ? QUIZ_DAILY_REWARD_PREVIEW
          : QUIZ_TOPIC_REWARD_PREVIEW,
      result:
        session.status === QuizSessionStatus.COMPLETED
          ? {
              score: session.score,
              totalQuestions: session.totalQuestions,
              answeredAttempts: session.answers.length,
              reward: {
                xp: session.xpAwarded,
                coins: session.coinsAwarded,
              },
            }
          : null,
    };
  }
}
