import { ApiPropertyOptional } from '@nestjs/swagger';
import { WagerStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListWagersDto {
  @ApiPropertyOptional({
    enum: WagerStatus,
    example: WagerStatus.PENDING,
    description: 'Optional wager status filter.',
  })
  @IsOptional()
  @IsEnum(WagerStatus)
  status?: WagerStatus;
}
