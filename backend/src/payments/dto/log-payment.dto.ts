import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class LogPaymentDto {
  @IsString() occurrenceId: string;
  @IsDateString() paidDate: string;
  @IsNumber() @Min(0) amountPaid: number;
  @IsOptional() @IsString() notes?: string;
}

/**
 * This Object Model's what the Frontend should send when a user is attempting to log a payment for a financial Obligation that is due.
 *
 *  {
 *    "occurrenceId": "some-payment-occurrence-id",
 *    "paidDate": "2026-05-19",
 *    "amountPaid": 751.83,
 *    "notes": "some special notes the user wants to make for this payment"
 *  }
 *
 */
