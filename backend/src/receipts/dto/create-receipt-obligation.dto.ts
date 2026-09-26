import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNumber,
    IsPositive,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
    Currency,
    ObligationPriority,
    ObligationType,
    ScheduleFrequency,
} from '@prisma/client';

export class CreateReceiptObligationDto {
    @ApiProperty({
        example: 'Woolworths',
        description: 'Name of the new obligation, initially populated from the OCR merchant.',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name!: string;

    @ApiProperty({
        example: 'category-uuid',
        description: 'ID of the selected category. Defaults to the Custom category in the frontend.',
    })
    @IsUUID()
    categoryId!: string;

    @ApiProperty({
        enum: ObligationType,
        example: ObligationType.CUSTOM,
    })
    @IsEnum(ObligationType)
    type!: ObligationType;

    @ApiProperty({
        enum: ObligationPriority,
        example: ObligationPriority.LOW,
    })
    @IsEnum(ObligationPriority)
    priority!: ObligationPriority;

    @ApiProperty({
        example: 482.9,
        description: 'Amount paid according to the reviewed receipt.',
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount!: number;

    @ApiProperty({
        enum: Currency,
        example: Currency.ZAR,
    })
    @IsEnum(Currency)
    currency!: Currency;

    @ApiProperty({
        example: '2026-09-25',
        description: 'Start date of the obligation, initially populated from the receipt date.',
    })
    @IsDateString()
    startDate!: string;

    @ApiProperty({
        enum: ScheduleFrequency,
        example: ScheduleFrequency.ONCE,
        description: 'Payment frequency. Defaults to ONCE in the frontend.',
    })
    @IsEnum(ScheduleFrequency)
    frequency!: ScheduleFrequency;

    @ApiProperty({
        example: true,
        description: 'User acknowledgement that the reviewed receipt information is correct.',
    })
    @IsBoolean()
    acknowledged!: boolean;
}