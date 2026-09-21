import { IsUUID } from 'class-validator';

export class GetReceiptScanParamsDto {
  @IsUUID()
  scanId!: string;
}