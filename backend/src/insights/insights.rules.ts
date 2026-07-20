export type InsightSeverity =|'positive'|'info'|'warning'|'critical';

export interface InsightCard {
    key: string;
    title: string;
    value: string;
    explanation: string;
    severity: InsightSeverity;
    link?: string;
}

export interface InsightsResponse {
    asOf: string;
    insights: InsightCard[];
}

export interface OnTimePaymentStats {
    asOf: string;
    onTimePaymentCount: number;
    latePaymentCount: number;
    missedPaymentCount: number;
    eligiblePaymentCount: number;
    onTimePaymentPercentage: number;
    hasEnoughData: boolean;
}

export function createOnTimePaymentInsight(stats: OnTimePaymentStats): InsightCard {
    if (!stats.hasEnoughData) {
        return {
            key: 'on-time-rate',
            title: 'On-time payment rate',
            value: 'Not enough data',
            explanation:'Complete more payments to build your payment history.',
            severity: 'info',
            link: 'TBD',
        };
    }
    let severity: InsightSeverity;
    if (stats.onTimePaymentPercentage >= 90) {
        severity = 'positive';
    } else if (stats.onTimePaymentPercentage >= 75) {
        severity = 'info';
    } else if (stats.onTimePaymentPercentage >= 50) {
        severity = 'warning';
    } else {
        severity = 'critical';
    }
    return {
        key: 'on-time-rate',
        title: 'On-time payment rate',
        value: `${stats.onTimePaymentPercentage}%`,
        explanation: `${stats.onTimePaymentCount} of ` + `${stats.eligiblePaymentCount} completed or missed payments were on time.`,
        severity,
        link: '/payments',
    };
}