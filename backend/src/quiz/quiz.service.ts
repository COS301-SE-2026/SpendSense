import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MascotMood,
  Prisma,
  QuizSessionStatus,
  QuizSessionType,
  QuizTopic,
  RewardTransactionType,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
import type { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
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

    return this.toSessionResponse(session, questions, {
      current: user.gamificationProfile?.currentKnowledgeStreak ?? 0,
      longest: user.gamificationProfile?.longestKnowledgeStreak ?? 0,
    });
  }

  async submitAnswer(
    authUser: AuthUser,
    sessionId: string,
    dto: SubmitQuizAnswerDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.quizSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
        select: this.sessionSelect,
      });

      if (!session) {
        throw new NotFoundException('Quiz session not found');
      }

      if (session.status !== QuizSessionStatus.IN_PROGRESS) {
        throw new ConflictException('Quiz session is already completed');
      }

      const questions = await this.selectQuestionPool(
        {
          type: session.type,
          ...(session.topic ? { topic: session.topic } : {}),
        },
        tx,
      );
      const currentQuestionId = this.getNextQuestionId(
        questions,
        session.answers,
      );

      if (!currentQuestionId) {
        throw new ConflictException('Quiz session has no remaining questions');
      }

      if (dto.questionId !== currentQuestionId) {
        throw new BadRequestException(
          'Question is not the current quiz question',
        );
      }

      const question = await tx.quizQuestion.findUnique({
        where: { id: dto.questionId },
        select: {
          id: true,
          topic: true,
          prompt: true,
          options: true,
          correctOptionKey: true,
          explanation: true,
        },
      });

      if (!question) {
        throw new NotFoundException('Quiz question not found');
      }

      const optionKeys = this.getOptionKeys(question.options);
      if (!optionKeys.includes(dto.selectedOptionKey)) {
        throw new BadRequestException('Selected option is not valid');
      }

      const isCorrect = dto.selectedOptionKey === question.correctOptionKey;
      const attemptNumber =
        session.answers.filter((answer) => answer.questionId === question.id)
          .length + 1;
      const answeredAt = new Date();

      await tx.quizSessionAnswer.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          selectedOptionKey: dto.selectedOptionKey,
          isCorrect,
          attemptNumber,
          answeredAt,
        },
      });

      const answersAfter = [
        ...session.answers,
        { questionId: question.id, isCorrect, answeredAt },
      ];
      const nextQuestionId = this.getNextQuestionId(questions, answersAfter);
      const score = session.score + (isCorrect ? 1 : 0);
      const completed = !nextQuestionId;

      if (!completed) {
        await tx.quizSession.update({
          where: { id: session.id },
          data: {
            score,
          },
        });
      }

      let result: {
        score: number;
        totalQuestions: number;
        answeredAttempts: number;
        reward: { xp: number; coins: number };
        knowledgeStreak: {
          previous: number;
          current: number;
          longest: number;
          advanced: boolean;
        };
      } | null = null;

      if (completed) {
        result = await this.settleCompletedSession(
          tx,
          session,
          user.id,
          score,
          answersAfter.length,
        );
      }

      const nextQuestion = questions.find(
        (candidate) => candidate.id === nextQuestionId,
      );

      return {
        sessionId: session.id,
        status: completed
          ? QuizSessionStatus.COMPLETED
          : QuizSessionStatus.IN_PROGRESS,
        feedback: {
          isCorrect,
          explanation: question.explanation,
          requeued: !isCorrect,
        },
        progress: {
          correct: score,
          answeredAttempts: answersAfter.length,
          initialQuestions: session.totalQuestions,
          remainingQueue: nextQuestionId
            ? this.getQueueLength(questions, answersAfter)
            : 0,
        },
        nextQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              number:
                questions.findIndex(
                  (candidate) => candidate.id === nextQuestion.id,
                ) + 1,
              topic: nextQuestion.topic,
              prompt: nextQuestion.prompt,
              options: nextQuestion.options,
            }
          : null,
        result,
      };
    });
  }

  private async settleCompletedSession(
    tx: Prisma.TransactionClient,
    session: {
      id: string;
      type: QuizSessionType;
      score: number;
      totalQuestions: number;
    },
    userId: string,
    score: number,
    answeredAttempts: number,
  ) {
    const reward =
      session.type === QuizSessionType.DAILY
        ? QUIZ_DAILY_REWARD_PREVIEW
        : QUIZ_TOPIC_REWARD_PREVIEW;
    const event = await tx.userEvent.create({
      data: {
        userId,
        eventType: UserEventType.QUIZ_COMPLETED,
        sourceType: UserEventSourceType.QUIZ,
        sourceId: session.id,
        metadata: {
          sessionType: session.type,
          score,
          totalQuestions: session.totalQuestions,
        },
      },
    });
    const profile = await tx.gamificationProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const previousKnowledgeStreak = profile.currentKnowledgeStreak;
    const currentKnowledgeStreak = previousKnowledgeStreak + 1;
    const longestKnowledgeStreak = Math.max(
      profile.longestKnowledgeStreak,
      currentKnowledgeStreak,
    );
    const coinBalance = profile.coinBalance + reward.coins;
    const xp = profile.xp + reward.xp;

    await tx.gamificationProfile.update({
      where: { id: profile.id },
      data: {
        coinBalance,
        xp,
        currentKnowledgeStreak,
        longestKnowledgeStreak,
        mascotMood: MascotMood.CELEBRATING,
      },
    });
    await tx.quizSession.update({
      where: { id: session.id },
      data: {
        status: QuizSessionStatus.COMPLETED,
        completedAt: new Date(),
        score,
        coinsAwarded: reward.coins,
        xpAwarded: reward.xp,
      },
    });
    await tx.rewardTransaction.create({
      data: {
        userId,
        sourceEventId: event.id,
        type: RewardTransactionType.EARNED,
        amount: reward.coins,
        balanceAfter: coinBalance,
        reason: 'Quiz completion reward',
      },
    });

    return {
      score,
      totalQuestions: session.totalQuestions,
      answeredAttempts,
      reward,
      knowledgeStreak: {
        previous: previousKnowledgeStreak,
        current: currentKnowledgeStreak,
        longest: longestKnowledgeStreak,
        advanced: session.type === QuizSessionType.DAILY,
      },
    };
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
        answeredAt: true,
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

  private async selectQuestionPool(
    dto: CreateQuizSessionDto,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const questions = await client.quizQuestion.findMany({
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
    knowledgeStreak?: {
      current: number;
      longest: number;
    },
  ) {
    const nextQuestionId = questions
      ? this.getNextQuestionId(questions, session.answers)
      : undefined;
    const currentQuestion = questions?.find(
      (question) => question.id === nextQuestionId,
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
            number: (questions?.findIndex(
              (question) => question.id === currentQuestion.id,
            ) ?? -1) + 1,
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
              ...(knowledgeStreak
                ? {
                    knowledgeStreak: {
                      previous: Math.max(knowledgeStreak.current - 1, 0),
                      current: knowledgeStreak.current,
                      longest: knowledgeStreak.longest,
                      advanced: session.type === QuizSessionType.DAILY,
                    },
                  }
                : {}),
            }
          : null,
    };
  }

  private getNextQuestionId(
    questions: {
      id: string;
    }[],
    answers: {
      questionId: string;
      isCorrect: boolean;
      answeredAt?: Date;
    }[],
  ) {
    const queue = questions.map((question) => question.id);
    const orderedAnswers = [...answers].sort(
      (first, second) =>
        (first.answeredAt?.getTime() ?? 0) -
        (second.answeredAt?.getTime() ?? 0),
    );

    for (const answer of orderedAnswers) {
      const questionIndex = queue.indexOf(answer.questionId);
      if (questionIndex === -1) {
        continue;
      }

      queue.splice(questionIndex, 1);
      if (!answer.isCorrect) {
        queue.push(answer.questionId);
      }
    }

    return queue[0];
  }

  private getQueueLength(
    questions: { id: string }[],
    answers: {
      questionId: string;
      isCorrect: boolean;
      answeredAt?: Date;
    }[],
  ) {
    const queue: string[] = questions.map((question) => question.id);
    const orderedAnswers = [...answers].sort(
      (first, second) =>
        (first.answeredAt?.getTime() ?? 0) -
        (second.answeredAt?.getTime() ?? 0),
    );

    for (const answer of orderedAnswers) {
      const questionIndex = queue.indexOf(answer.questionId);
      if (questionIndex === -1) {
        continue;
      }

      queue.splice(questionIndex, 1);
      if (!answer.isCorrect) {
        queue.push(answer.questionId);
      }
    }

    return queue.length;
  }

  private getOptionKeys(options: unknown): string[] {
    if (!Array.isArray(options)) {
      return [];
    }

    return options.flatMap((option: unknown) => {
      if (typeof option !== 'object' || option === null) {
        return [];
      }

      const optionRecord = option as Record<string, unknown>;
      return typeof optionRecord.key === 'string' ? [optionRecord.key] : [];
    });
  }
}
