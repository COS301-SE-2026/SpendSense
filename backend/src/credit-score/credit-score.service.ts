import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_HISTORY_SCORES, BUDGET_PRESSURE, CREDIT_SCORE_MODEL_VERSION, CREDIT_SCORE_RANGE, CREDIT_SCORE_COMPONENT_WEIGHTS, PRIORITY_WEIGHTS, RISK_CAPS } from './credit-score.constants'
import { PaymentOccurrenceStatus } from "@prisma/client";

@Injectable()
export class CreditScoreService {

    constructor(private readonly prisma: PrismaService) { }
    async getCreditScore(userId: string) {

        let score = CREDIT_SCORE_COMPONENT_WEIGHTS.BUDGET_PRESSURE * await this.calculateBudgetPressureScore(userId);

        return {
            creditScore: score,
        }

    }

    private async calculatePaymentHistory(userId: string): Promise<number> {

        const occurrences = await this.prisma.paymentOccurrence.findMany({
            where: {
                userId,
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        displayName: true,
                    }

                },
                status: true,
                payment: {
                    select: {
                        daysLate: true,
                    },
                },
                obligation: {
                    select: {
                        priority: true,
                    },
                }
            }
        });

        if (occurrences.length === 0) {
            return 0;
        }
        let weightedHistoryScore = 0;
        let priorityWeightTotal = 0;

        for (const occurrence of occurrences) {
            let daysLate = occurrence.payment?.daysLate;
            if (daysLate === null) {
                daysLate = 0;
            }
            const historyScore = this.getWeightedHistoryScore(occurrence.status, daysLate);
            weightedHistoryScore += historyScore * PRIORITY_WEIGHTS[occurrence.obligation.priority];
            priorityWeightTotal += PRIORITY_WEIGHTS[occurrence.obligation.priority];

            console.log('Payment history calculation:', {
                userId: occurrence.user.id,
                name: occurrence.user.displayName,
                occurrenceId: occurrence.id,
                status: occurrence.status,
                daysLate,
                priority: occurrence.obligation.priority,
                historyScore,
                weightedHistoryScore,
                priorityWeightTotal,
            });
        }

        if (priorityWeightTotal === 0) {
            return 0;
        }

        return weightedHistoryScore / priorityWeightTotal;

    }

    private getWeightedHistoryScore(occurrenceStatus: PaymentOccurrenceStatus, daysLate: number | undefined): number {
        if (occurrenceStatus === PaymentOccurrenceStatus.MISSED || occurrenceStatus === PaymentOccurrenceStatus.OVERDUE) {
            return PAYMENT_HISTORY_SCORES.MISSED;
        }

        if (daysLate === undefined) {
            return PAYMENT_HISTORY_SCORES.MISSED;
        }

        if (daysLate <= 0) {
            return PAYMENT_HISTORY_SCORES.ON_TIME;
        }

        if (daysLate <= 3) {
            return PAYMENT_HISTORY_SCORES.LATE_1_TO_3_DAYS;
        }

        if (daysLate <= 7) {
            return PAYMENT_HISTORY_SCORES.LATE_4_TO_7_DAYS;
        }

        if (daysLate <= 14) {
            return PAYMENT_HISTORY_SCORES.LATE_8_TO_14_DAYS;
        }

        if (daysLate <= 30) {
            return PAYMENT_HISTORY_SCORES.LATE_15_TO_30_DAYS;
        }

        return PAYMENT_HISTORY_SCORES.LATE_MORE_THAN_30_DAYS;
    }

    private async calculateBudgetPressureScore(userId: string,): Promise<number> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                monthlyBudget: true,
            },
        });

        const monthlyBudget = Number(user?.monthlyBudget);
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        const result = await this.prisma.paymentOccurrence.aggregate({
            where: {
                userId,
                dueDate: {
                    gte: startOfMonth,
                    lt: startOfNextMonth,
                },
                status: {
                    not: PaymentOccurrenceStatus.CANCELLED,
                },
                obligation: {
                    deletedAt: null,
                },
            },
            _sum: {
                amountDue: true,
            },
        });

        const monthlyCommittedObligations = Number(result._sum.amountDue ?? 0,);
        const budgetPressureRatio = monthlyCommittedObligations / monthlyBudget;
        const budgetPressureRatioScore = this.getBudgetPressureScore(budgetPressureRatio);

        console.log('calculateBudgetPressureScore', {
            Budget: monthlyBudget,
            AmountDue: result._sum.amountDue,
            monthlyCommittedObligations_: monthlyCommittedObligations,
            budgetPressureRatio_: budgetPressureRatio,
            budgetPressureRatioScore_: budgetPressureRatioScore

        });

        return budgetPressureRatioScore;
    }

    private getBudgetPressureScore(budgetPressureRatio: number,): number {
        if (budgetPressureRatio <= 0.5) {
            return BUDGET_PRESSURE.LT_50 ;
        }

        if (budgetPressureRatio <= 0.7 && budgetPressureRatio > 0.5) {
            return BUDGET_PRESSURE.BTWN_50_70 ;
        }

        if (budgetPressureRatio <= 0.9 && budgetPressureRatio > 0.7) {
            return BUDGET_PRESSURE.BTWN_70_90 ;
        }

        if (budgetPressureRatio <= 1 && budgetPressureRatio > 0.9) {
            return BUDGET_PRESSURE.BTWN_90_100 ;
        }

        return BUDGET_PRESSURE.GT_100 ;
    }
}


