import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveSimulationEventDto {
  @ApiProperty({
    example: 'payment_plan',
    description:
      'The ID of one option in the currently revealed fictional event.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  optionId!: string;
}
