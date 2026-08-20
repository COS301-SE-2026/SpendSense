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
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';
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
    private readonly rewardService: RewardService,
    private readonly badgeEngineService: BadgeEngineService,
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
      const questions = await this.getSessionQuestions(existingSession, dto);
      if ((existingSession.questionIds ?? []).length === 0) {
        await this.prisma.quizSession.update({
          where: { id: existingSession.id },
          data: { questionIds: questions.map((question) => question.id) },
        });
      }
      return this.toSessionResponse(existingSession, questions);
    }

    if (
      dto.type === QuizSessionType.DAILY &&
      existingSession?.status === QuizSessionStatus.COMPLETED
    ) {
      throw new ConflictException('The daily quiz is already completed today');
    }

    const questions = await this.selectQuestionPool(
      dto,
      this.prisma,
      dto.type === QuizSessionType.DAILY ? dateRange.date : undefined,
    );

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
        questionIds: questions.map((question) => question.id),
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

    const questions = await this.getSessionQuestions(session, {
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
    now = new Date(),
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

      const questions = await this.getSessionQuestions(
        session,
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
      const answeredAt = now;

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
        badgesEarned: string[];
      } | null = null;

      if (completed) {
        result = await this.settleCompletedSession(
          tx,
          session,
          user.id,
          score,
          answersAfter.length,
          user.gamificationProfile?.currentKnowledgeStreak ?? 0,
          user.gamificationProfile?.longestKnowledgeStreak ?? 0,
          user.gamificationProfile?.lastKnowledgeStreakDate ?? null,
          now,
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
    previousKnowledgeStreak: number,
    previousLongestKnowledgeStreak: number,
    lastKnowledgeStreakDate: Date | null,
    now: Date,
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
    const advancesStreak = session.type === QuizSessionType.DAILY;
    const today = this.getJohannesburgDateRange(now).start;
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const streakIsCurrent =
      lastKnowledgeStreakDate?.getTime() === today.getTime();
    const streakIsConsecutive =
      lastKnowledgeStreakDate?.getTime() === yesterday.getTime();
    const streakNeedsReset =
      advancesStreak && !streakIsCurrent && !streakIsConsecutive;
    const settlement = await this.rewardService.settleAction(tx, {
      userId,
      sourceEventId: event.id,
      coins: { amount: reward.coins, reason: 'Quiz completion reward' },
      xp: { amount: reward.xp },
      ...(advancesStreak && !streakIsCurrent && !streakNeedsReset
        ? {
            streak: { field: 'currentKnowledgeStreak' as const, advance: true },
          }
        : {}),
      mood: {
        value: MascotMood.HAPPY,
        reason: 'Quiz completed',
      },
    });
    let streak = settlement.streak;
    if (streakNeedsReset) {
      await this.rewardService.advanceStreak(tx, {
        userId,
        field: 'currentKnowledgeStreak',
        advance: false,
      });
      streak = await this.rewardService.advanceStreak(tx, {
        userId,
        field: 'currentKnowledgeStreak',
        advance: true,
      });
    }
    if (advancesStreak && !streakIsCurrent) {
      await tx.gamificationProfile.update({
        where: { userId },
        data: { lastKnowledgeStreakDate: today },
      });
    }
    const currentKnowledgeStreak = streak?.current ?? previousKnowledgeStreak;
    const longestKnowledgeStreak =
      streak?.longest ?? previousLongestKnowledgeStreak;
    await tx.quizSession.update({
      where: { id: session.id },
      data: {
        status: QuizSessionStatus.COMPLETED,
        completedAt: now,
        score,
        coinsAwarded: reward.coins,
        xpAwarded: reward.xp,
      },
    });
    const badgesEarned = await this.badgeEngineService.evaluateQuizBadges(
      { userId, sourceEventId: event.id, currentKnowledgeStreak },
      tx,
    );
    return {
      score,
      totalQuestions: session.totalQuestions,
      answeredAttempts,
      reward,
      knowledgeStreak: {
        previous: previousKnowledgeStreak,
        current: currentKnowledgeStreak,
        longest: longestKnowledgeStreak,
        advanced: advancesStreak && !streakIsCurrent,
      },
      badgesEarned,
    };
  }

  private daysBetweenJohannesburgDates(earlier: string, later: string): number {
    const earlierDate = new Date(`${earlier}T00:00:00.000Z`);
    const laterDate = new Date(`${later}T00:00:00.000Z`);
    return Math.round(
      (laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private readonly sessionSelect = {
    id: true,
    type: true,
    topic: true,
    quizDate: true,
    status: true,
    startedAt: true,
    completedAt: true,
    score: true,
    totalQuestions: true,
    questionIds: true,
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
    seed?: string,
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

    return this.shuffleQuestions(questions, seed).slice(0, 5);
  }

  private async getSessionQuestions(
    session: { questionIds?: string[]; quizDate?: Date | null },
    dto: CreateQuizSessionDto,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const questionIds = session.questionIds ?? [];
    if (questionIds.length > 0) {
      const questions = await client.quizQuestion.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          topic: true,
          prompt: true,
          options: true,
        },
      });
      const questionsById = new Map(
        questions.map((question) => [question.id, question]),
      );
      return questionIds.flatMap((questionId) => {
        const question = questionsById.get(questionId);
        return question ? [question] : [];
      });
    }

    const dailySeed =
      dto.type === QuizSessionType.DAILY && session.quizDate
        ? this.getJohannesburgDateRange(session.quizDate).date
        : undefined;
    return this.selectQuestionPool(dto, client, dailySeed);
  }

  private shuffleQuestions<T>(questions: T[], seed?: string): T[] {
    const shuffled = [...questions];
    let random = Math.random;
    if (seed) {
      let hash = 2166136261;
      for (const character of seed) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      random = () => {
        hash += hash << 13;
        hash ^= hash >>> 7;
        hash += hash << 3;
        hash ^= hash >>> 17;
        hash += hash << 5;
        return (hash >>> 0) / 4294967296;
      };
    }
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }
    return shuffled;
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
            number:
              (questions?.findIndex(
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
