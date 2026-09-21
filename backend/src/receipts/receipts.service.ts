import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import {
  ObligationStatus,
  PaymentOccurrenceStatus,
  ReceiptScanStatus,
  Currency,
  PaymentContributionSource,
  Prisma,
} from '@prisma/client';
import { isUUID } from 'class-validator';
import { ConfirmReceiptScanDto } from './dto/confirm-receipt-scan.dto';
import { PaymentContributionsService } from '../payments/payment-contributions.service';

type PreselectedOccurrenceProjection = {
  id: string;
  obligationId: string;
  obligationName: string;
  dueDate: string;
  currency: Currency;
  amountDue: string;
  amountPaid: string;
  amountRemaining: string;
  status: PaymentOccurrenceStatus;
  canRecord: boolean;
};

type OcrResult = {
  request_id: string;
  merchant: string | null;
  receipt_date: string | null;
  total: string | null;
  currency: string | null;
  confidence: number;
  warnings: string[];
};

type ReceiptConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const OCR_TIMEOUT_MS = 25_000;
const SCAN_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentContributionsService: PaymentContributionsService,
  ) {}

  async validateReceiptUpload(
    userId: string,
    file: Express.Multer.File | undefined,
    preselectedOccurrenceId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt image is required.');
    }

    if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new HttpException(
        {
          code: 'RECEIPT_TOO_LARGE',
          message: 'Receipt image exceeds the 8 MiB size limit.',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid image.');
    }

    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
      throw new BadRequestException('Receipt must be a JPEG or PNG image.');
    }
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException(
        'Could not determine receipt image dimensions.',
      );
    }

    const decodedPixels = metadata.width * metadata.height;
    const MAX_PIXELS = 12_000_000;

    if (decodedPixels > MAX_PIXELS) {
      throw new BadRequestException(
        'Receipt image exceeds the 12 million pixel limit.',
      );
    }

    const expectedType =
      metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    if (file.mimetype !== expectedType) {
      throw new BadRequestException(
        'Receipt image content does not match its declared type.',
      );
    }

    if (preselectedOccurrenceId) {
      const occurrence = await this.prisma.paymentOccurrence.findFirst({
        where: {
          id: preselectedOccurrenceId,
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!occurrence) {
        throw new NotFoundException(
          'Preselected payment occurrence not found.',
        );
      }
    }

    const ocr = await this.processReceiptOcr(file);
    const confidence = this.getReceiptConfidence(ocr.confidence);
    const extraction = {
      amountCandidates:
        ocr.total !== null
          ? [
              {
                value: ocr.total,
                currency: ocr.currency ?? '',
                confidence,
                label: 'Total',
              },
            ]
          : [],
      merchant:
        ocr.merchant !== null
          ? {
              value: ocr.merchant,
              confidence,
            }
          : null,
      receiptDate:
        ocr.receipt_date !== null
          ? {
              value: ocr.receipt_date,
              confidence,
            }
          : null,
      warnings: ocr.warnings,
    };
    if (
      extraction.amountCandidates.length === 0 &&
      extraction.merchant === null &&
      extraction.receiptDate === null
    ) {
      throw new HttpException(
        {
          code: 'OCR_NO_USABLE_RESULT',
          message: 'No usable receipt details could be identified.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const scan = await this.prisma.receiptScan.create({
      data: {
        userId,
        status: ReceiptScanStatus.READY_FOR_REVIEW,
        preselectedOccurrenceId: preselectedOccurrenceId ?? null,
        extraction,
        warnings: ocr.warnings,
        expiresAt: new Date(Date.now() + SCAN_EXPIRY_MS),
      },
      select: {
        id: true,
        status: true,
        extraction: true,
        warnings: true,
        expiresAt: true,
        preselectedOccurrenceId: true,
      },
    });
    return {
      id: scan.id,
      status: scan.status,
      expiresAt: scan.expiresAt,
      extraction: scan.extraction,
      warnings: scan.warnings ?? [],
      preselectedOccurrenceId: scan.preselectedOccurrenceId,
    };
  }

  private async processReceiptOcr(
    file: Express.Multer.File,
  ): Promise<OcrResult> {
    const serviceUrl = process.env.AI_SERVICE_URL;
    const serviceToken = process.env.AI_SERVICE_TOKEN;
    if (!serviceUrl || !serviceToken) {
      throw new HttpException(
        {
          code: 'OCR_UNAVAILABLE',
          message: 'Receipt scanning is temporarily unavailable.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const requestId = randomUUID();
    const form = new FormData();
    form.append(
      'file',
      new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }),
      file.originalname || 'receipt',
    );
    let response: Response;
    try {
      response = await fetch(`${serviceUrl.replace(/\/$/, '')}/ocr/process`, {
        method: 'POST',
        headers: {
          'X-Service-Token': serviceToken,
          'X-Request-Id': requestId,
        },
        body: form,
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      });
    } catch {
      throw new HttpException(
        {
          code: 'OCR_UNAVAILABLE',
          message: 'Receipt scanning is temporarily unavailable.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!response.ok) {
      this.handleOcrFailure(response.status);
    }
    let result: OcrResult;
    try {
      result = (await response.json()) as OcrResult;
    } catch {
      throw new HttpException(
        {
          code: 'OCR_UNAVAILABLE',
          message: 'Receipt scanning returned an invalid response.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (
      !result ||
      result.request_id !== requestId ||
      (result.merchant !== null && typeof result.merchant !== 'string') ||
      (result.receipt_date !== null &&
        typeof result.receipt_date !== 'string') ||
      (result.total !== null && typeof result.total !== 'string') ||
      (result.currency !== null && typeof result.currency !== 'string') ||
      typeof result.confidence !== 'number' ||
      !Number.isFinite(result.confidence) ||
      result.confidence < 0 ||
      result.confidence > 1 ||
      !Array.isArray(result.warnings) ||
      !result.warnings.every((warning: unknown) => typeof warning === 'string')
    ) {
      throw new HttpException(
        {
          code: 'OCR_UNAVAILABLE',
          message: 'Receipt scanning returned an invalid response.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return result;
  }

  private handleOcrFailure(status: number): never {
    if (status === 429) {
      throw new HttpException(
        {
          code: 'OCR_BUSY',
          message: 'Receipt scanning is busy. Please try again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 413) {
      throw new HttpException(
        {
          code: 'RECEIPT_TOO_LARGE',
          message: 'Receipt image exceeds the allowed size.',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    if (status === 415 || status === 422) {
      throw new HttpException(
        {
          code: 'UNSUPPORTED_RECEIPT',
          message: 'Receipt image could not be processed.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    throw new HttpException(
      {
        code: 'OCR_UNAVAILABLE',
        message: 'Receipt scanning is temporarily unavailable.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private getReceiptConfidence(confidence: number): ReceiptConfidence {
    if (confidence >= 0.85) return 'HIGH';
    if (confidence >= 0.6) return 'MEDIUM';
    if (confidence > 0) return 'LOW';
    return 'UNKNOWN';
  }

  async getReceiptScan(userId: string, scanId: string) {
    if (!isUUID(scanId)) {
      throw this.receiptScanNotFound();
    }

    const now = new Date();

    const scan = await this.prisma.receiptScan.findFirst({
      where: {
        id: scanId,
        userId,
        status: ReceiptScanStatus.READY_FOR_REVIEW,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        status: true,
        extraction: true,
        warnings: true,
        expiresAt: true,
        preselectedOccurrenceId: true,
      },
    });

    if (!scan) {
      throw this.receiptScanNotFound();
    }

    let preselectedOccurrence: PreselectedOccurrenceProjection | null = null;

    if (scan.preselectedOccurrenceId) {
      const occurrence = await this.prisma.paymentOccurrence.findFirst({
        where: {
          id: scan.preselectedOccurrenceId,
          userId,
          deletedAt: null,
          obligation: {
            is: {
              deletedAt: null,
            },
          },
        },
        select: {
          id: true,
          obligationId: true,
          dueDate: true,
          currency: true,
          amountDue: true,
          amountPaid: true,
          status: true,
          obligation: {
            select: {
              name: true,
              status: true,
            },
          },
        },
      });

      if (occurrence) {
        const amountRemaining = occurrence.amountDue.minus(
          occurrence.amountPaid,
        );
        const payableStatuses: PaymentOccurrenceStatus[] = [
          PaymentOccurrenceStatus.PENDING,
          PaymentOccurrenceStatus.PARTIALLY_PAID,
          PaymentOccurrenceStatus.OVERDUE,
        ];

        const canRecord =
          payableStatuses.includes(occurrence.status) &&
          occurrence.obligation.status === ObligationStatus.ACTIVE &&
          amountRemaining.greaterThan(0);

        preselectedOccurrence = {
          id: occurrence.id,
          obligationId: occurrence.obligationId,
          obligationName: occurrence.obligation.name,
          dueDate: occurrence.dueDate.toISOString().slice(0, 10),
          currency: occurrence.currency,
          amountDue: occurrence.amountDue.toFixed(2),
          amountPaid: occurrence.amountPaid.toFixed(2),
          amountRemaining: amountRemaining.toFixed(2),
          status: occurrence.status,
          canRecord,
        };
      }
    }

    return {
      id: scan.id,
      status: scan.status,
      expiresAt: scan.expiresAt,
      extraction: scan.extraction,
      warnings: scan.warnings ?? [],
      preselectedOccurrenceId: scan.preselectedOccurrenceId,
      preselectedOccurrence,
    };
  }

  private receiptScanNotFound() {
    return new NotFoundException({
      statusCode: 404,
      code: 'RECEIPT_SCAN_NOT_FOUND',
      message: 'Receipt scan not found.',
    });
  }

  async confirmReceiptScan(
    userId: string,
    scanId: string,
    dto: ConfirmReceiptScanDto,
    idempotencyKey: string | undefined,
  ) {
    if (!isUUID(scanId)) {
      throw this.receiptScanNotFound();
    }
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'INVALID_CONFIRMATION',
        message: 'A valid Idempotency-Key UUID is required.',
      });
    }
    if (dto.acknowledged !== true) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'INVALID_CONFIRMATION',
        message: 'Receipt confirmation must be acknowledged.',
      });
    }

    const paidDate = new Date(dto.paidDate);
    if (Number.isNaN(paidDate.getTime()) || paidDate.getTime() > Date.now()) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'INVALID_CONFIRMATION',
        message: 'Payment date is invalid or in the future.',
      });
    }

    const notes = dto.notes?.trim();
    if (dto.notes !== undefined && !notes) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'INVALID_CONFIRMATION',
        message: 'Notes cannot be blank.',
      });
    }

    return this.paymentContributionsService.createContribution({
      userId,
      occurrenceId: dto.occurrenceId,
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency,
      paidDate,
      source: PaymentContributionSource.RECEIPT_SCAN,
      idempotencyKey,
      notes,
      receiptScanId: scanId,
    });
  }
}
