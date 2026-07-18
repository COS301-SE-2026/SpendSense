import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { QuizTopic } from '@prisma/client';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@ApiBearerAuth()
@Controller('quiz')
@UseGuards(SupabaseJwtGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

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
