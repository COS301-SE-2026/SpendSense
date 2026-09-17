import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

export class UpdateSimulationStatusDto {
  @ApiProperty({
    example: 'pause',
    enum: ['pause'],
    description:
      'The supported fictional session-status action in this slice. Resume and discard are added later.',
  })
  @IsString()
  @Equals('pause')
  action!: 'pause';
}
