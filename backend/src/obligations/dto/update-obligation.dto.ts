import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsDateString,
  IsBoolean,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ObligationPriority,
  ObligationStatus,
  ScheduleFrequency,
} from '@prisma/client';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ enum: ScheduleFrequency })
  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;
}

export class UpdateObligationDto {
  @ApiPropertyOptional({ example: 'Netflix Premium' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 229.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ enum: ObligationPriority })
  @IsOptional()
  @IsEnum(ObligationPriority)
  priority?: ObligationPriority;

  @ApiPropertyOptional({ enum: ObligationStatus })
  @IsOptional()
  @IsEnum(ObligationStatus)
  status?: ObligationStatus;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: UpdateScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateScheduleDto)
  schedule?: UpdateScheduleDto;

  @ApiPropertyOptional({
    example: true,
    description: 'Regenerate future unpaid occurrences after a schedule change',
  })
  @IsOptional()
  @IsBoolean()
  regenerateFutureOccurrences?: boolean;
}
