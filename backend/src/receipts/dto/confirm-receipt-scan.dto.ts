import {
  Equals,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { Currency } from '@prisma/client';

export class ConfirmReceiptScanDto {
  @IsUUID() occurrenceId!: string;
  @IsString() amount: string;
  @IsEnum(Currency) currency: Currency;
  @IsDateString() paidDate: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @Equals(true, {
    message: 'acknowledged must be true',
  })
  acknowledged!: true;
}
