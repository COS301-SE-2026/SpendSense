import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitQuizAnswerDto {
  @ApiProperty({ example: 'question_123' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  selectedOptionKey!: string;
}
