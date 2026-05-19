import{
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsPositive,
    IsDateString,
    IsBoolean,
    IsInt,
    IsArray,
    Min,
    Max,
    MaxLength,
    MinLength,
    ValidateNested,
}from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import{
    ObligationType,
    ObligationPriority,
    Currency,
    ScheduleFrequency,
    ReminderChannel,
}from '@prisma/client';

export class CreateScheduleDto{
    @ApiProperty({enum: ScheduleFrequency, example: 'MONTHLY'})
    @IsEnum(ScheduleFrequency)
    frequency: ScheduleFrequency;

    @ApiPropertyOptional({example: 1, default: 1})
    @IsOptional()
    @IsInt()
    @Min(1)
    interval: number = 1;

    @ApiPropertyOptional({example: 1, description: 'Day of month (1-28) for MONTHLY schedules'})
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(28)
    dayOfMonth?: number;

    @ApiPropertyOptional({example: 6, description: 'Total instalments - required for FIXED_INSTALLMENT'})
    @IsOptional()
    @IsInt()
    @Min(1)
    totalOccurrences?: number;
}

export class CreateRemindersDto{
    @ApiPropertyOptional({example: true})
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({example: [3, 1]})
    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @Min(0, {each: true})
    daysBefore?: number[];

    @ApiPropertyOptional({enum: ReminderChannel, isArray: true, example: ['IN_APP']})
    @IsOptional()
    @IsArray()
    @IsEnum(ReminderChannel, {each: true})
    channels?: ReminderChannel[];
}

export class CreateObligationDto{
    @ApiProperty({example: 'Netflix'})
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name: string;

    @ApiPropertyOptional({example: 'Monthly streaming subscription'})
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({enum: ObligationType, example: 'SUBSCRIPTION'})
    @IsEnum(ObligationType)
    type: ObligationType;

    @ApiProperty({example: 'cat_subscriptions', description: 'Valid category ID'})
    @IsString()
    categoryId: string;

    @ApiProperty({example: 199.0})
    @IsNumber({maxDecimalPlaces: 2})
    @IsPositive()
    amount: number;

    @ApiPropertyOptional({enum: Currency, example: 'ZAR', default: 'ZAR'})
    @IsOptional()
    @IsEnum(Currency)
    currency: Currency = Currency.ZAR;

    @ApiPropertyOptional({enum: ObligationPriority, example: 'MEDIUM', default: 'MEDIUM'})
    @IsOptional()
    @IsEnum(ObligationPriority)
    priority: ObligationPriority = ObligationPriority.MEDIUM;

    @ApiProperty({example: '2026-05-01'})
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({example: null})
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({type: CreateScheduleDto})
    @ValidateNested()
    @Type(()=>CreateScheduleDto)
    schedule: CreateScheduleDto;

    @ApiPropertyOptional({type: CreateRemindersDto})
    @IsOptional()
    @ValidateNested()
    @Type(()=>CreateRemindersDto)
    reminders?: CreateRemindersDto;
}