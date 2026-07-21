import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, PaymentOccurrenceStatus, PaymentRecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createCategoryBreakdownInsight, createObligationTrendInsight, createOnTimePaymentInsight, createPaymentStreakInsight, createUpcomingPressureInsight, } from "./insights.rules";
import { CategoryBreakdownStats, InsightsResponse, ObligationTrendStats, OnTimePaymentStats, PaymentPeriodStats, PaymentStreakStats, UpcomingPressureStats, } from "./insights.types";

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 7;
const RECENT_MONTH_COUNT = 3;
const WEEKS_PER_MONTH = 4.345;

const INSIGHT_CURRENCY = Currency.ZAR; // for demo 2 we will be using ZAR

const SETTLED_PAYMENT_STATUSES: PaymentOccurrenceStatus[] = [
    PaymentOccurrenceStatus.PAID,
    PaymentOccurrenceStatus.PAID_LATE,
];

const STREAK_STATUSES: PaymentOccurrenceStatus[] = [
    PaymentOccurrenceStatus.PAID,
    PaymentOccurrenceStatus.PAID_LATE,
    PaymentOccurrenceStatus.MISSED,
    PaymentOccurrenceStatus.OVERDUE,
];

// helper fucntions 
function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
}

function addUtcMonths(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function roundOne(value: number): number {
    return Number(value.toFixed(1));
}

function emptyPaymentPeriod(): PaymentPeriodStats {
    return {
        onTimePaymentCount: 0,
        latePaymentCount: 0,
        missedPaymentCount: 0,
        eligiblePaymentCount: 0,
        onTimePaymentPercentage: 0,
    };
}

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
    async getOnTimePaymentRateOLD(supabaseAuthId: string,): Promise<OnTimePaymentStats> {

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


    // aDDING new functions here for simplified version - once comlete remove the specific above functions that we will not use. 

    async getInsights(supabaseAuthId: string): Promise<InsightsResponse> {
        const userId = await this.resolveUserId(supabaseAuthId);
        const asOf = new Date();
        const [onTimeStats, trendStats, upcomingStats, categoryStats, streakStats] =
            await Promise.all([
                this.getOnTimePaymentRate(userId, asOf),
                this.getObligationTrend(userId, asOf),
                this.getUpcomingPressure(userId, asOf),
                this.getCategoryBreakdown(userId, asOf),
                this.getPaymentStreak(userId, asOf),
            ]);

        return {
            asOf: asOf.toISOString(),
            insights: [
                createOnTimePaymentInsight(onTimeStats),
                createObligationTrendInsight(trendStats),
                createUpcomingPressureInsight(upcomingStats),
                createCategoryBreakdownInsight(categoryStats),
                createPaymentStreakInsight(streakStats),
            ],
        };
    }

    private async getOnTimePaymentRate(supabaseAuthId: string, asOf: Date,): Promise<OnTimePaymentStats> {
        const userId = await this.resolveUserId(supabaseAuthId);
        const currentStart = startOfUtcMonth(asOf);
        const currentEnd = addUtcMonths(currentStart, 1);
        const previousStart = addUtcMonths(currentStart, -1);

        const occurrences = await this.prisma.paymentOccurrence.findMany(
            {
                where: {
                    userId,
                    deletedAt: null,
                    dueDate: { gte: previousStart, lt: currentEnd, },
                    status: { in: [PaymentOccurrenceStatus.PAID, PaymentOccurrenceStatus.PAID_LATE, PaymentOccurrenceStatus.MISSED] },
                    obligation: { is: { deletedAt: null } },
                },
                select: {
                    dueDate: true,
                    status: true,
                    payment: { select: { paymentStatus: true } },
                },
            }
        );

        const currentPeriod = emptyPaymentPeriod();
        const previousPeriod = emptyPaymentPeriod();

        for (const occurrence of occurrences) {
            const period = occurrence.dueDate >= currentStart ? currentPeriod : previousPeriod;

            if (occurrence.payment?.paymentStatus === PaymentRecordStatus.ON_TIME) {
                period.onTimePaymentCount += 1;
            } else if (
                occurrence.payment?.paymentStatus === PaymentRecordStatus.LATE
            ) {
                period.latePaymentCount += 1;
            } else if (occurrence.status === PaymentOccurrenceStatus.MISSED) {
                period.missedPaymentCount += 1;
            }
        }

        for (const period of [currentPeriod, previousPeriod]) {
            period.eligiblePaymentCount = period.onTimePaymentCount + period.latePaymentCount + period.missedPaymentCount;
            period.onTimePaymentPercentage = period.eligiblePaymentCount === 0 ? 0 : roundOne((period.onTimePaymentCount / period.eligiblePaymentCount) * 100);
        }
        const percentagePointChange = previousPeriod.eligiblePaymentCount === 0 ? null : roundOne(currentPeriod.onTimePaymentPercentage - previousPeriod.onTimePaymentPercentage);

        return {
            currentPeriod,
            previousPeriod,
            percentagePointChange,
            hasEnoughData: currentPeriod.eligiblePaymentCount > 0,
        };
    }


    private async getObligationTrend(supabaseAuthId: string, asOf: Date): Promise<ObligationTrendStats> {
        const userId = await this.resolveUserId(supabaseAuthId);
        const currentStart = startOfUtcMonth(asOf);
        const currentEnd = addUtcMonths(currentStart, 1);
        const previousStart = addUtcMonths(currentStart, -1);

        const occurrences = await this.prisma.paymentOccurrence.findMany(
            {
                where: {
                    userId,
                    deletedAt: null,
                    currency: INSIGHT_CURRENCY,
                    dueDate: { gte: previousStart, lt: currentEnd },
                    status: { not: PaymentOccurrenceStatus.CANCELLED },
                    obligation: { is: { deletedAt: null } },
                },
                select: {
                    dueDate: true,
                    amountDue: true,
                },
            }
        );

        let currentMonthAmount = 0;
        let previousMonthAmount = 0;

        for (const occurrence of occurrences) {
            const amount = Number(occurrence.amountDue);
            if (occurrence.dueDate >= currentStart) currentMonthAmount += amount;
            else previousMonthAmount += amount;
        }

        currentMonthAmount = roundMoney(currentMonthAmount);
        previousMonthAmount = roundMoney(previousMonthAmount);
        const amountChange = roundMoney(currentMonthAmount - previousMonthAmount);
        const percentageChange = previousMonthAmount === 0 ? null : roundOne((amountChange / previousMonthAmount) * 100);

        return {
            currency: INSIGHT_CURRENCY,
            currentMonthAmount,
            previousMonthAmount,
            amountChange,
            percentageChange,
            hasEnoughData: currentMonthAmount > 0 || previousMonthAmount > 0,
        };
    }


    private async getUpcomingPressure(supabaseAuthId: string, asOf: Date): Promise<UpcomingPressureStats> {
        const userId = await this.resolveUserId(supabaseAuthId);

        const windowStart = startOfUtcDay(asOf);
        const windowEnd = addUtcDays(windowStart, UPCOMING_WINDOW_DAYS);

        const currentMonthStart = startOfUtcMonth(asOf);
        const recentStart = addUtcMonths(currentMonthStart, -RECENT_MONTH_COUNT);

        const [upcomingOccurrences, recentOccurrences] = await this.prisma.$transaction(
            [
                this.prisma.paymentOccurrence.findMany({
                    where: {
                        userId,
                        deletedAt: null,
                        currency: INSIGHT_CURRENCY,
                        dueDate: { gte: windowStart, lt: windowEnd, },
                        status: PaymentOccurrenceStatus.PENDING,
                        obligation: { is: { deletedAt: null, }, },
                    },
                    select: { obligationId: true, dueDate: true, amountDue: true, },
                    orderBy: { dueDate: "asc" },
                }),
                
                this.prisma.paymentOccurrence.findMany({
                    where: {
                        userId,
                        deletedAt: null,
                        currency: INSIGHT_CURRENCY,
                        dueDate: { gte: recentStart, lt: currentMonthStart },
                        status: { not: PaymentOccurrenceStatus.CANCELLED },
                        obligation: { is: { deletedAt: null } },
                    },
                    select: { amountDue: true, },
                }),
            ]
        );


        const upcomingAmount = roundMoney(upcomingOccurrences.reduce((total, occurrence) => total + Number(occurrence.amountDue), 0,),);
        const recentTotal = recentOccurrences.reduce((total, occurrence) => total + Number(occurrence.amountDue), 0,);
        const recentAverageMonthlyAmount = recentTotal / RECENT_MONTH_COUNT;
        const recentAverageWeeklyAmount = roundMoney(recentAverageMonthlyAmount / WEEKS_PER_MONTH,);
        const pressureRatio = recentAverageWeeklyAmount === 0 ? null : roundOne(upcomingAmount / recentAverageWeeklyAmount);
        return {
            currency: INSIGHT_CURRENCY,
            windowDays: UPCOMING_WINDOW_DAYS,
            paymentCount: upcomingOccurrences.length,
            obligationCount: new Set(upcomingOccurrences.map((occurrence) => occurrence.obligationId),).size,
            upcomingAmount,
            recentAverageWeeklyAmount,
            pressureRatio,
            nextDueDate: upcomingOccurrences[0]?.dueDate.toISOString() ?? null,
            hasEnoughData: upcomingOccurrences.length > 0,
        };

    }



    private async getCategoryBreakdown(supabaseAuthId: string, asOf: Date): Promise<CategoryBreakdownStats> {
        const userId = await this.resolveUserId(supabaseAuthId);

    }

    private async getPaymentStreak(supabaseAuthId: string, asOf: Date): Promise<PaymentStreakStats> {
        const userId = await this.resolveUserId(supabaseAuthId);

    }

};