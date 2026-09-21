import { Currency } from '@prisma/client';
import {
    IsDateString,
    IsDecimal,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateContributionDto {
    @IsUUID() occurrenceId: string;

    @IsDecimal({
        decimal_digits: '0,2',
        force_decimal: false,
    })
    amount: string;

    @IsEnum(Currency) currency: Currency;

    @IsDateString() paidDate: string;

    @IsOptional()

    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString() @MaxLength(500) notes?: string;
}