import { ObligationPriority } from "@prisma/client";

export const CREDIT_SCORE_MODEL_VERSION = 'V1'; // current versions of the Credit Model

export const CREDIT_SCORE_RANGE = {
    MIN: 300,
    MAX: 850,
    RANGE: 550,
} as const;

// model will look like healthIndex = 0.4*X1 + 0.25*X2 + 0.1*X3 + 0.15*X4 + 0.1*X5 
export const CREDIT_SCORE_COMPONENT_WEIGHTS = {
    PAYMENT_HISTORY: 0.4,
    BUDGET_PRESSURE: 0.25,
    SAVINGS_BUFFER: 0.1,
    HISTORY_LENGTH: 0.15,
    OBLIGATION_DIVERSITY: 0.1,
} as const

export const PAYMENT_HISTORY_SCORES = {
    ON_TIME: 1,
    LATE_1_TO_3_DAYS: 0.85,
    LATE_4_TO_7_DAYS: 0.7,
    LATE_8_TO_14_DAYS: 0.5,
    LATE_15_TO_30_DAYS: 0.25,
    LATE_MORE_THAN_30_DAYS: 0.05,
    MISSED: 0,
} as const;

// adding the weights to to exisitng obligationPriority enum
export const PRIORITY_WEIGHTS: Record<ObligationPriority, number> = {
    LOW: 0.25,
    MEDIUM: 0.5,
    HIGH: 0.75,
    CRITICAL: 1
};

// max value a credit score can be considering various situations a user may be in - to maintain integrity of credit scoring system
export const RISK_CAPS = {
    NO_PAYMENT_HISTORY: 650,
    CURRENT_OVERDUE_PAYMENT: 700,
    RECENT_LATE_15_TO_30: 680,
    RECENT_MISSED_PAYMENT: 620,
    RECENT_MISSED_CRITICAL_OBLIGATION: 580,
    OVER_BUDGET: 670,
    NONE: 850,
} as const;
export const RISK_CAP_REASONS = {
    NO_PAYMENT_HISTORY: 'Insuffiecient payment history',
    CURRENT_OVERDUE_PAYMENT: 'There is an existing overdue payment within the last 90 days',
    RECENT_LATE_15_TO_30: 'In the last 90 days there is a later payemt ofer +14 days',
    RECENT_MISSED_PAYMENT: 'In the last 90 days there is a missed payment',
    RECENT_MISSED_CRITICAL_OBLIGATION: 'In the last 90 days there is a missed critical obligation',
    OVER_BUDGET: 'You are over budget this month',
    NONE: 'NONE',
} as const;

export const BUDGET_PRESSURE = {
    LT_50: 1.00,
    BTWN_50_70: 0.75,
    BTWN_70_90: 0.5,
    BTWN_90_100: 0.25,
    GT_100: 0.00
} as const;

export const SAVINGS_BUFFER = {
    GT_20: 1.00,
    BTWN_10_20: 0.70,
    BTWN_0_10: 0.30,
    OVER_BUDGET: 0.00,
} as const;

export const HISTORY_LENGTH_SCORE = {
    ZERO_MONTHS: 0.00,
    THREE_MONTHS: 0.125,
    SIX_MONTHS: 0.25,
    TWELVE_MONTHS: 0.5,
    EIGHTEEN_MONTHS: 0.75,
    GT_EQ_TWENTYFOUR_MONTHS: 1.00,
} as const;

export const HISTORY_LENGTH_CONFIG = {
    MONTHS_FOR_MAX_SCORE: 24,
} as const;

export type RiskCapResult = {
    applied: boolean;
    cap: number;
    reason: string;
};