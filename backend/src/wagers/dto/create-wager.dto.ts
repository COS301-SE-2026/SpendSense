import { ApiProperty } from '@nestjs/swagger';
import { WagerTaskType } from '@prisma/client';
import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';

export class CreateWagerDto {
  @ApiProperty({
    example: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
    description: 'ID of the friend being challenged.',
  })
  @IsUUID()
  opponentId!: string;

  @ApiProperty({
    enum: WagerTaskType,
    example: WagerTaskType.ALL_PAYMENTS_ON_TIME,
    description: 'Task the participants will compete on.',
  })
  @IsEnum(WagerTaskType)
  taskType!: WagerTaskType;

  @ApiProperty({
    example: 50,
    minimum: 0,
    description: 'Coin amount staked by each participant.',
  })
  @IsInt()
  @Min(0)
  stakeAmount!: number;

  @ApiProperty({
    example: 7,
    minimum: 1,
    description: 'Length of the wager in days after acceptance.',
  })
  @IsInt()
  @Min(1)
  durationDays!: number;
}
