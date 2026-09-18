import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateSimulationStatusDto {
  @ApiProperty({
    example: 'resume',
    enum: ['pause', 'resume'],
    description: 'Pause or resume a fictional session. Discard is added later.',
  })
  @IsString()
  @IsIn(['pause', 'resume'])
  action!: 'pause' | 'resume';
}
