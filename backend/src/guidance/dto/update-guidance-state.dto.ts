import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsEnum,
  IsString,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuidanceWalkthroughStatus } from '@prisma/client';

export class UpdateWalkthroughDto {
  @ApiPropertyOptional({
    enum: GuidanceWalkthroughStatus,
    example: GuidanceWalkthroughStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(GuidanceWalkthroughStatus)
  status?: GuidanceWalkthroughStatus;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    maximum: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  currentStep?: number;
}

export class UpdateGuidanceStateDto {
  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  tipsEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  dailyExpansionEnabled?: boolean;

  @ApiPropertyOptional({
    type: UpdateWalkthroughDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateWalkthroughDto)
  walkthrough?: UpdateWalkthroughDto;

  @ApiPropertyOptional({
    example: 'calendar.overdue.explainer',
  })
  @IsOptional()
  @IsString()
  dismissTipId?: string;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  resetDismissedTips?: boolean;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  replayWalkthrough?: boolean;
}
