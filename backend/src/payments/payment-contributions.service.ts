import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
    Currency,
    MascotMood,
    NotificationType,
    PaymentContributionSource,
    PaymentOccurrenceStatus,
    Prisma,
    ReminderStatus,
    RewardTransactionType,
    ScoreEventType,
    ScoreTier,
    UserEventSourceType,
    UserEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'node:crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { RewardService } from '../rewards/reward.service';
import { CreditScoreService } from '../credit-score/credit-score.service';


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

const ON_TIME_COINS = 15;
const ON_TIME_XP = 10;

@Injectable()
export class PaymentContributionsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly badgeEngineService: BadgeEngineService,
        private readonly rewardService: RewardService,
        private readonly creditScoreService: CreditScoreService,
    ) { }



    async createContribution(input: CreateContributionInput) {

        const amount = new Prisma.Decimal(input.amount);

        // contribution must be positive.
        if (amount.lessThanOrEqualTo(0)) {
            throw new BadRequestException('Payment contribution must be greater than zero.');
        }

        const payloadHash = this.createPayloadHash(input);

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
            const terminalStatuses: PaymentOccurrenceStatus[] = [
                PaymentOccurrenceStatus.PAID,
                PaymentOccurrenceStatus.PAID_LATE,
                PaymentOccurrenceStatus.MISSED,
                PaymentOccurrenceStatus.CANCELLED,
            ];
            if (terminalStatuses.includes(occurrence.status)) {
                throw new BadRequestException('Payment occurrence cannot receive another contribution.');
            }
            if (input.currency !== occurrence.currency) {
                throw new BadRequestException('Payment currency does not match occurrence currency.');
            }

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

            // creating a paymentContribtuion (this could either be a full settlement or a partial payment - think paymentRecord)
            const contribution = await tx.paymentContribution.create({
                data: {
                    userId: input.userId,

                    // trusted occurrence relationships from the database:
                    occurrenceId: occurrence.id,
                    obligationId: occurrence.obligationId,

                    amount,
                    currency: occurrence.currency,
                    paidDate: input.paidDate,

                    source: input.source,

                    receiptScanId: input.receiptScanId ?? null,
                    notes: input.notes ?? null,

                    idempotencyKey: input.idempotencyKey,
                    requestPayloadHash: payloadHash,
                },
            });

            // CASE: PARTIALL_PAD ================================================================
            if (!settlesOccurrence) {
                const updatedOccurrence = await tx.paymentOccurrence.update({
                    where: {
                        id: occurrence.id,
                    },
                    data: {
                        amountPaid: newAmountPaid,
                        status: PaymentOccurrenceStatus.PARTIALLY_PAID,
                        paidAt: null, // paidAt means FINAL settlement only 
                    },
                });

                return {
                    replayed: false,

                    contribution: {
                        id: contribution.id,
                        occurrenceId: contribution.occurrenceId,
                        obligationId: contribution.obligationId,
                        amount: contribution.amount.toFixed(2),
                        currency: contribution.currency,
                        paidDate: contribution.paidDate,
                        source: contribution.source,
                        state: contribution.state,
                        receiptScanId: contribution.receiptScanId, // this could be NULL, does not have to be a partial contribution via OCR, could be manual.
                        notes: contribution.notes,
                        createdAt: contribution.createdAt,
                    },
                    occurrence: {
                        id: updatedOccurrence.id,
                        obligationId: updatedOccurrence.obligationId,
                        obligationName: occurrence.obligation.name,
                        dueDate: updatedOccurrence.dueDate,
                        amountDue: updatedOccurrence.amountDue.toFixed(2),
                        amountPaid: updatedOccurrence.amountPaid.toFixed(2),
                        amountRemaining: remainingAfter.toFixed(2),
                        currency: updatedOccurrence.currency,
                        status: updatedOccurrence.status,
                        paidAt: updatedOccurrence.paidAt,
                    },
                    settlement: null,
                    scoreImpact: null,
                    rewards: null,
                };
            }
            // CASE: PAID VS PAID_LATE ? ================================================================
            const isLate = occurrence.overdueAt !== null || occurrence.status === PaymentOccurrenceStatus.OVERDUE || input.paidDate.getTime() > occurrence.dueDate.getTime();
            const finalStatus = isLate ? PaymentOccurrenceStatus.PAID_LATE : PaymentOccurrenceStatus.PAID;
            const daysLate = isLate ? Math.max(0, Math.ceil((input.paidDate.getTime() - occurrence.dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

            const updatedOccurrence = await tx.paymentOccurrence.update({
                where: {
                    id: occurrence.id,
                },

                data: {
                    amountPaid: newAmountPaid,
                    status: finalStatus,
                    paidAt: input.paidDate,
                },
            });

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

    private createPayloadHash(input: CreateContributionInput): string {
        const payload = JSON.stringify({
            occurrenceId: input.occurrenceId,
            amount: input.amount.toFixed(2),
            currency: input.currency,
            paidDate: input.paidDate.toISOString(),
            source: input.source,
            receiptScanId: input.receiptScanId ?? null,
            notes: input.notes ?? null,
        });
        return createHash('sha256').update(payload).digest('hex');
    }
}