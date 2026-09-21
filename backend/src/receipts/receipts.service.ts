import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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

    // this is a temporary response until OCR integration
    return {
      validated: true,

      image: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        sizeBytes: file.size,
      },

      preselectedOccurrenceId: preselectedOccurrenceId ?? null,
    };
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
