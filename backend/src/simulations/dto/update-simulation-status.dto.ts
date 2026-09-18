import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateSimulationStatusDto {
  @ApiProperty({
    example: 'resume',
    enum: ['pause', 'resume', 'discard'],
    description: 'Pause, resume, or discard a fictional session.',
  })
  @IsString()
  @IsIn(['pause', 'resume', 'discard'])
  action!: 'pause' | 'resume' | 'discard';
}
