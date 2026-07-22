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