import { BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { Currency, PaymentContributionSource, PaymentOccurrenceStatus, Prisma} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreateContributionInput = {
    userId: string;
    occurrenceId: string;
    amount: Prisma.Decimal;
    currency: Currency;
    paidDate: Date;
    source: PaymentContributionSource;
    idempotencyKey: string;
    notes?: string;
    receiptScanId?: string;
};

@Injectable()
export class PaymentContributionsService {

    constructor(private readonly prisma: PrismaService) { }

    async createContribution(input: CreateContributionInput) {

        const amount = new Prisma.Decimal(input.amount);

        // contribution must be positive.
        if (amount.lessThanOrEqualTo(0)) {
            throw new BadRequestException('Payment contribution must be greater than zero.');
        }

        // lock thsi occurance while the transaction is in progress - prevents two payments from readnng the same remaoning balance 
        return this.prisma.$transaction(async (tx) => {

            // purpose of raw SQL: Lock this PaymentOccurrence row until this transaction finishes
            await tx.$queryRaw`
                SELECT "id"
                FROM "PaymentOccurrence"
                WHERE "id" = ${input.occurrenceId}
                AND "userId" = ${input.userId}
                AND "deletedAt" IS NULL
                FOR UPDATE
            `;

            const occurrence = await tx.paymentOccurrence.findFirst({
                where: {
                    id: input.occurrenceId,
                    userId: input.userId,
                    deletedAt: null,
                },
                include: {
                    obligation: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            if (!occurrence) {
                throw new NotFoundException('Payment occurrence not found.');
            }

            // once an OCCURANCE has reached one of these states, it cannot recieve more CONTRIBUTIONS
            const terminalStatuses: PaymentOccurrenceStatus[] = [
                PaymentOccurrenceStatus.PAID,
                PaymentOccurrenceStatus.PAID_LATE,
                PaymentOccurrenceStatus.MISSED,
                PaymentOccurrenceStatus.CANCELLED,
            ];
            if (terminalStatuses.includes(occurrence.status)) {
                throw new BadRequestException('Payment occurrence cannot receive another contribution.');
            }
            // contrubtion & occurnce currency must match
            if (input.currency !== occurrence.currency) {
                throw new BadRequestException('Payment currency does not match occurrence currency.');
            }

            // calcualte the ramining
            const remainingBefore = occurrence.amountDue.minus(occurrence.amountPaid,);

            if (remainingBefore.lessThan(0)) {
                throw new BadRequestException('Payment occurrence has an invalid balance.');
            }
            if (amount.greaterThan(remainingBefore)) {
                throw new BadRequestException(`Payment amount exceeds remaining balance of ${remainingBefore.toFixed(2)}.`);
            }

            const newAmountPaid = occurrence.amountPaid.plus(amount);
            const remainingAfter = occurrence.amountDue.minus(newAmountPaid);
            const settlesOccurrence = remainingAfter.equals(0);

            // TODO payment contribution writing - not yet writing becausse o f modifications that still need to happen
            return {
                occurrence: {
                    id: occurrence.id,
                    obligationId: occurrence.obligationId,
                    obligationName: occurrence.obligation.name,
                    amountDue: occurrence.amountDue.toFixed(2),
                    amountPaidBefore: occurrence.amountPaid.toFixed(2),
                    amountPaidAfter: newAmountPaid.toFixed(2),
                    amountRemainingBefore: remainingBefore.toFixed(2),
                    amountRemainingAfter: remainingAfter.toFixed(2),
                    currency: occurrence.currency,
                    status: occurrence.status,
                },
                requestedContribution: {
                    amount: amount.toFixed(2),
                    currency: input.currency,
                    paidDate: input.paidDate,
                    source: input.source,
                },
                settlesOccurrence,
            };
        });
    }
}