import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ObligationStatus,
  PaymentOccurrenceStatus,
  PaymentContributionState,
} from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { EligibleOccurrencesQueryDto } from './dto/eligible-occurrences-query.dto';
import { ContributionHistoryQueryDto } from './dto/contribution-history-query.dto';

@Injectable()
export class PaymentQueriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getEligibleOccurrences(
    userId: string,
    query: EligibleOccurrencesQueryDto,
  ) {
    const { limit = 20, cursor, from, to } = query;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('"from" date cannot be after "to" date.');
    }

    let cursorId: string | undefined;
    if (cursor) {
      cursorId = this.decodeCursor(cursor);
    }

    const dueDateFilter =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const where = {
      userId,
      deletedAt: null,
      status: {
        in: [
          PaymentOccurrenceStatus.PENDING,
          PaymentOccurrenceStatus.PARTIALLY_PAID,
          PaymentOccurrenceStatus.OVERDUE,
        ],
      },
      amountPaid: {
        lt: this.prisma.paymentOccurrence.fields.amountDue, // occurances with an outstanding amount the user still needs to pay.
      },
      obligation: {
        is: {
          status: ObligationStatus.ACTIVE,
          deletedAt: null,
        },
      },
      ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
    };

    // make sure cursor belongs to the approprate authed user
    if (cursorId) {
      const cursorOccurrence = await this.prisma.paymentOccurrence.findFirst({
        where: {
          ...where,
          id: cursorId,
        },
        select: {
          id: true,
        },
      });
      if (!cursorOccurrence) {
        throw new BadRequestException('Invalid cursor');
      }
    }

    // fetch an extra recrod so we knwo if another page exists
    const occurrences = await this.prisma.paymentOccurrence.findMany({
      where,
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          obligation: {
            priority: 'desc',
          },
        },
        {
          id: 'asc',
        },
      ],
      include: {
        obligation: {
          select: {
            name: true,
            priority: true,
          },
        },
      },
    });

    const hasMore = occurrences.length > limit;
    const pageItems = hasMore ? occurrences.slice(0, limit) : occurrences;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? this.encodeCursor(pageItems[pageItems.length - 1].id)
        : null;

    const items = pageItems.map((occurrence) => {
      const amountRemaining = occurrence.amountDue.minus(occurrence.amountPaid);
      return {
        id: occurrence.id,
        obligationId: occurrence.obligationId,
        obligationName: occurrence.obligation.name,
        dueDate: occurrence.dueDate,
        currency: occurrence.currency,
        amountDue: occurrence.amountDue.toFixed(2),
        amountPaid: occurrence.amountPaid.toFixed(2),
        amountRemaining: amountRemaining.toFixed(2),
        status: occurrence.status,
        canRecord: true,
      };
    });
    return {
      items,
      nextCursor,
    };
  }

  private encodeCursor(id: string): string {
    return Buffer.from(id, 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): string {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (!isUUID(decoded)) {
        throw new Error();
      }
      return decoded;
    } catch {
      throw new BadRequestException('Invalid cursor.');
    }
  }
}
