import { ObligationPriority, ScoreTier } from "@prisma/client";

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' ; 

export interface PaymentHistoryItem {
    missed: boolean;
    daysLate: number;
    priority: ObligationPriority;    
}