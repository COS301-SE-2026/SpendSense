import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentOccurrenceStatus, PaymentRecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createOnTimePaymentInsight, InsightsResponse, OnTimePaymentStats } from './insights.rules';

const SETTLED_PAYMENT_STATUSES: PaymentOccurrenceStatus[] = [
    PaymentOccurrenceStatus.PAID,
    PaymentOccurrenceStatus.PAID_LATE,
];
@Injectable()
export class InsightsService {
    constructor(private readonly prisma: PrismaService) { }

    // convert auth id into payment occurance table userId
    private async resolveUserId(supabaseAuthId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: {
                supabaseAuthId,
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            throw new NotFoundException('SpendSense user profile could not be found');
        }
        return user.id;
    }

    // FUNCTION - GET THE SETTLED PAYMENTS
    async getSettledPayments(supabaseAuthId: string) {
        const userId = await this.resolveUserId(supabaseAuthId);
        const settledPayments = await this.prisma.paymentOccurrence.findMany({
            where: {
                userId,
                deletedAt: null,
                status: { in: SETTLED_PAYMENT_STATUSES },
                obligation: { is: { deletedAt: null } },
            },
            select: {
                id: true,
                obligationId: true,
                dueDate: true,
                amountDue: true,
                currency: true,
                status: true,
                sequenceNumber: true,
                paidAt: true,
                obligation: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        status: true,
                        priority: true,
                        amount: true,
                        currency: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                                iconKey: true,
                                colourKey: true,
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        id: true,
                        amountPaid: true,
                        paidDate: true,
                        paymentStatus: true,
                        daysLate: true,
                        simulatedInterest: true,
                        notes: true,
                    },
                },
            },

            orderBy: [{ paidAt: 'desc' }, { dueDate: 'desc' }],
        });

        const payments = settledPayments.map((occurrence) => ({
            id: occurrence.id,
            obligationId: occurrence.obligationId,
            dueDate: occurrence.dueDate,
            amountDue: Number(occurrence.amountDue),
            currency: occurrence.currency,
            status: occurrence.status,
            sequenceNumber: occurrence.sequenceNumber,
            paidAt: occurrence.paidAt,

            obligation: {
                ...occurrence.obligation,
                amount: Number(occurrence.obligation.amount),
            },

            payment: occurrence.payment
                ? {
                    ...occurrence.payment,
                    amountPaid: Number(occurrence.payment.amountPaid),
                    simulatedInterest: Number(occurrence.payment.simulatedInterest),
                }
                : null,
        }));

        return {
            count: payments.length,
            payments,
        };
    }

    // FUNCTION - GET THE SETTLEDMENT RATE
    async getSettlementRate(supabaseAuthId: string) {
        const userId = await this.resolveUserId(supabaseAuthId);
        const asOf = new Date();
        const [eligiblePaymentCount, settledPaymentCount] =
            await this.prisma.$transaction([
                this.prisma.paymentOccurrence.count({
                    where: {
                        userId,
                        deletedAt: null,
                        dueDate: { lte: asOf },
                        status: { not: PaymentOccurrenceStatus.CANCELLED },
                        obligation: { is: { deletedAt: null } },
                    },
                }),
                this.prisma.paymentOccurrence.count({
                    where: {
                        userId,
                        deletedAt: null,
                        dueDate: { lte: asOf },
                        status: { in: SETTLED_PAYMENT_STATUSES },
                        obligation: { is: { deletedAt: null } },
                    },
                }),
            ]);
        const unsettledPaymentCount = eligiblePaymentCount - settledPaymentCount;
        let settlementPercentage = 0;
        if (eligiblePaymentCount !== 0) {
            settlementPercentage = Number(
                ((settledPaymentCount / eligiblePaymentCount) * 100).toFixed(2),
            );
        }
        return {
            asOf: asOf.toISOString(),
            settledPaymentCount,
            unsettledPaymentCount,
            eligiblePaymentCount,
            settlementPercentage,
            hasEnoughData: eligiblePaymentCount > 0,
        };
    }

    // FUNCTION - CALCULATE THE ON TIME PAYMENT RATE
    async getOnTimePaymentRate(supabaseAuthId: string,): Promise<OnTimePaymentStats> {

        const userId = await this.resolveUserId(supabaseAuthId);
        const asOf = new Date();
        const [onTimePaymentCount, latePaymentCount, missedPaymentCount] = await this.prisma.$transaction(
            [

                this.prisma.paymentOccurrence.count(
                    {
                        where: {
                            userId,
                            deletedAt: null,
                            dueDate: { lte: asOf },
                            status: { in: SETTLED_PAYMENT_STATUSES },
                            payment: { is: { paymentStatus: PaymentRecordStatus.ON_TIME } },
                            obligation: { is: { deletedAt: null } },
                        },
                    }
                ),

                this.prisma.paymentOccurrence.count(
                    {
                        where: {
                            userId,
                            deletedAt: null,
                            dueDate: { lte: asOf },
                            status: { in: SETTLED_PAYMENT_STATUSES },
                            payment: { is: { paymentStatus: PaymentRecordStatus.LATE } },
                            obligation: { is: { deletedAt: null } },
                        },
                    }
                ),

                this.prisma.paymentOccurrence.count(
                    {
                        where: {
                            userId,
                            deletedAt: null,
                            dueDate: { lte: asOf },
                            status: PaymentOccurrenceStatus.MISSED,
                            obligation: { is: { deletedAt: null } },
                        },
                    }
                ),
            ]
        );

        let eligiblePaymentCount = onTimePaymentCount + latePaymentCount + missedPaymentCount;
        let onTimePaymentPercentage = 0;
        if (eligiblePaymentCount !== 0) {
            onTimePaymentPercentage = Number(((onTimePaymentCount / eligiblePaymentCount) * 100).toFixed(2));
        }

        return {
            asOf: asOf.toISOString(),
            onTimePaymentCount,
            latePaymentCount,
            missedPaymentCount,
            eligiblePaymentCount,
            onTimePaymentPercentage,
            hasEnoughData: eligiblePaymentCount > 0,
        };
    }

    async getInsights(supabaseAuthId: string): Promise<InsightsResponse> {
        const onTimeStats = await this.getOnTimePaymentRate(supabaseAuthId);
        const onTimeInsight = createOnTimePaymentInsight(onTimeStats);
        return {
            asOf: onTimeStats.asOf,
            insights: [onTimeInsight],
        };
    }
};