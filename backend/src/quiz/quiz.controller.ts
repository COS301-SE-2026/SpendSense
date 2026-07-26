import {
  Controller,
  Body,
  Get,
  Post,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { QuizTopic } from '@prisma/client';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@ApiBearerAuth()
@Controller('quiz')
@UseGuards(SupabaseJwtGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('daily')
  @ApiOperation({
    summary: 'Get daily quiz state',
    description:
      'Returns the authenticated user’s daily quiz state for the current Africa/Johannesburg calendar date without creating a session or awarding rewards.',
  })
  @ApiOkResponse({
    description: 'Daily quiz state wrapped by the global response envelope.',
    schema: {
      examples: {
        available: {
          value: {
            data: {
              date: '2026-07-13',
              status: 'AVAILABLE',
              session: null,
              rewardPreview: { xp: 50, coins: 25 },
              knowledgeStreak: { current: 3, longest: 7 },
            },
          },
        },
        inProgress: {
          value: {
            data: {
              date: '2026-07-13',
              status: 'IN_PROGRESS',
              session: {
                id: 'session_123',
                type: 'DAILY',
                status: 'IN_PROGRESS',
                progress: {
                  correct: 2,
                  answeredAttempts: 3,
                  initialQuestions: 5,
                  remainingQueue: 4,
                },
              },
              rewardPreview: { xp: 50, coins: 25 },
            },
          },
        },
        completed: {
          value: {
            data: {
              date: '2026-07-13',
              status: 'COMPLETED',
              session: {
                id: 'session_123',
                type: 'DAILY',
                status: 'COMPLETED',
                score: 5,
                totalQuestions: 5,
                completedAt: '2026-07-13T08:12:00.000Z',
              },
              reward: { xp: 50, coins: 25 },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async getDaily(@CurrentAuthUser() authUser: AuthUser) {
    return this.quizService.getDaily(authUser);
  }

  @Post('sessions')
  @ApiOperation({
    summary: 'Create or resume a quiz session',
    description:
      'Creates a daily or topic quiz session, or returns the authenticated user’s existing matching in-progress session. Questions are selected server-side and never include the correct option key.',
  })
  @ApiBody({ type: CreateQuizSessionDto })
  @ApiOkResponse({
    description:
      'New or resumed quiz session wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          id: 'session_123',
          type: 'DAILY',
          topic: null,
          status: 'IN_PROGRESS',
          startedAt: '2026-07-13T08:00:00.000Z',
          completedAt: null,
          progress: {
            correct: 0,
            answeredAttempts: 0,
            initialQuestions: 5,
            remainingQueue: 5,
          },
          currentQuestion: {
            id: 'question_123',
            number: 1,
            topic: 'CREDIT_SCORE',
            prompt:
              'Which behaviour is most likely to improve a simulated credit-health score?',
            options: [
              { key: 'A', text: 'Paying obligations on time' },
              { key: 'B', text: 'Ignoring overdue payments' },
            ],
          },
          rewardPreview: { xp: 50, coins: 25 },
        },
      },
    },
  })
  @ApiConflictResponse({
    description:
      'The daily quiz has already been completed or the request conflicts with the session rules.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async createSession(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: CreateQuizSessionDto,
  ) {
    return this.quizService.createOrResumeSession(authUser, dto);
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get a quiz session',
    description:
      'Returns an authenticated user’s quiz session for refresh and resume support. Session ownership is enforced and correct answers are never returned.',
  })
  @ApiOkResponse({
    description: 'Quiz session wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          id: 'session_123',
          type: 'DAILY',
          topic: null,
          status: 'IN_PROGRESS',
          startedAt: '2026-07-13T08:00:00.000Z',
          completedAt: null,
          progress: {
            correct: 2,
            answeredAttempts: 3,
            initialQuestions: 5,
            remainingQueue: 4,
          },
          currentQuestion: {
            id: 'question_123',
            number: 2,
            topic: 'CREDIT_SCORE',
            prompt:
              'Which behaviour is most likely to improve a simulated credit-health score?',
            options: [
              { key: 'A', text: 'Paying obligations on time' },
              { key: 'B', text: 'Ignoring overdue payments' },
            ],
          },
          result: null,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The session does not exist for the authenticated user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async getSession(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') sessionId: string,
  ) {
    return this.quizService.getSession(authUser, sessionId);
  }

  @Post('sessions/:id/answer')
  @ApiOperation({
    summary: 'Submit a quiz answer',
    description:
      'Validates and records an answer, requeues incorrect questions, and settles the session atomically when the queue is empty.',
  })
  @ApiBody({ type: SubmitQuizAnswerDto })
  @ApiOkResponse({
    description:
      'Answer feedback and the next quiz state wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          sessionId: 'session_123',
          status: 'IN_PROGRESS',
          feedback: {
            isCorrect: true,
            explanation:
              'Paying on time provides positive evidence of reliable behaviour.',
            requeued: false,
          },
          progress: {
            correct: 3,
            answeredAttempts: 4,
            initialQuestions: 5,
            remainingQueue: 2,
          },
          nextQuestion: {
            id: 'question_456',
            number: 5,
            topic: 'CREDIT_SCORE',
            prompt: 'Which action supports financial health?',
            options: [{ key: 'A', text: 'Pay on time' }],
          },
          result: null,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'The question is not current or the selected option is invalid.',
  })
  @ApiConflictResponse({
    description:
      'The session is already completed or the answer conflicts with the current session state.',
  })
  @ApiNotFoundResponse({
    description:
      'The session or question does not exist for the authenticated user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async submitAnswer(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') sessionId: string,
    @Body() dto: SubmitQuizAnswerDto,
  ) {
    return this.quizService.submitAnswer(authUser, sessionId, dto);
  }

  @Get('topics')
  @ApiOperation({
    summary: 'List quiz topics',
    description:
      'Returns every supported quiz topic and marks topics with active seeded questions as available.',
  })
  @ApiOkResponse({
    description: 'Quiz topics wrapped by the global response envelope.',
    schema: {
      example: {
        data: [
          {
            key: 'CREDIT_SCORE',
            name: 'Credit Score',
            description:
              'Learn how everyday payment behaviour affects financial health.',
            available: true,
            questionCount: 5,
            rewardPreview: { xp: 20, coins: 10 },
          },
          {
            key: 'INTEREST',
            name: 'Interest',
            description:
              'Learn how interest changes the cost of borrowing and saving.',
            available: false,
            questionCount: 0,
            rewardPreview: null,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async listTopics() {
    return this.quizService.listTopics();
  }

  @Get('topics/:topic')
  @ApiOperation({
    summary: 'Get quiz topic teaching content',
    description:
      'Returns teaching content for an available topic without creating a quiz session.',
  })
  @ApiOkResponse({
    description:
      'Topic teaching content wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          key: 'CREDIT_SCORE',
          name: 'Credit Score',
          description:
            'Learn how everyday payment behaviour affects financial health.',
          teachingContent: {
            title: 'How payment behaviour affects your score',
            body: 'Paying obligations on time gives the model positive evidence of reliable behaviour. Late or missed payments can reduce the score.',
            keyPoints: [
              'On-time payments build positive history.',
              'Late payments can reduce financial health.',
              'SpendSense uses a simulated score for education.',
            ],
          },
          available: true,
          questionCount: 5,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The topic is invalid or has no active seeded questions.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async getTopic(@Param('topic') topic: string) {
    return this.quizService.getTopic(this.parseTopic(topic));
  }

  private parseTopic(topic: string): QuizTopic {
    const normalisedTopic = topic.toUpperCase() as QuizTopic;

    if (!Object.values(QuizTopic).includes(normalisedTopic)) {
      throw new NotFoundException('Quiz topic is not available');
    }

    return normalisedTopic;
  }
}
