export type CreditScore = {
    applicableRisk: {
        applied: boolean;
        cap: number;
        reason: string;
    };
    reasonForRiskCaps: string;
    creditScore: number;
    creditScoreTier: string;
    savingsBuffer: number;
    onTimePaymentCount: number;
    onLatePaymentCount: number;
};