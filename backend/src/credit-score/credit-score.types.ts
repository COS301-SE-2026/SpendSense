import { ObligationPriority, ScoreTier } from "@prisma/client";

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PaymentHistoryItem {
    missed: boolean;
    daysLate: number;
    priority: ObligationPriority;
}

export interface CreditScoreInput {
    paymentHistoryItems: PaymentHistoryItem[];
    monthsWithPaymentHistory: number;
    successfullyManagedTypes: number;
    monthlyCommittedObligations: number;
    monthlyBudget: number | null;
    hasCurrentOverduePayment: boolean;
    hasRecentLate15To30: boolean;
    hasRecentMissedPayment: boolean;
    hasRecentMissedCriticalObligation: boolean;
}

export interface CreditScoreResult {
    modelVersion: string;
    calculatedScore: number;
    finalScore: number;
    scoreTier: ScoreTier;
    pointsCap: number;
    appliedCaps: string[];
    confidence: ConfidenceLevel;
    components: {
        paymentHistoryScore: number;
        budgetPressureScore: number;
        savingsBufferScore: number;
        historyLengthScore: number;
        obligationDiversityScore: number;
        healthIndex: number;
        budgetPressureRatio: number | null;
        savingsBufferRatio: number | null;
        monthlyCommittedObligations: number;
        monthlyBudget: number | null;
        monthsWithPaymentHistory: number;
        successfullyManagedTypes: number;
    };
}