import { IsOptional, IsUUID } from 'class-validator';

export class CreateReceiptScanDto {
  @IsOptional()
  @IsUUID()
  preselectedOccurrenceId?: string;
}
