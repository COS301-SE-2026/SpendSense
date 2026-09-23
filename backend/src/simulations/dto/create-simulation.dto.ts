import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CreateSimulationDto {
  @ApiProperty({
    example: true,
    description:
      'Whether this fictional month advances automatically every 15 seconds.',
  })
  @IsBoolean()
  timedMode!: boolean;
}
