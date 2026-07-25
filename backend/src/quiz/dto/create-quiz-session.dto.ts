import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizSessionType, QuizTopic } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateQuizSessionDto {
  @ApiProperty({ enum: QuizSessionType, example: QuizSessionType.DAILY })
  @IsEnum(QuizSessionType)
  type!: QuizSessionType;

  @ApiPropertyOptional({
    enum: QuizTopic,
    example: QuizTopic.CREDIT_SCORE,
    description: 'Required when type is TOPIC.',
  })
  @IsOptional()
  @IsEnum(QuizTopic)
  topic?: QuizTopic;
}
