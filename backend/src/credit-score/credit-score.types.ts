import { ObligationPriority, ScoreTier } from "@prisma/client";

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' ; 

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