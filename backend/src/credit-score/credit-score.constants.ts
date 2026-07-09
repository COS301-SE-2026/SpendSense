// contains the necessary constatnts for current spendSense credit model
import { ObligationPriority } from "@prisma/client";

export const CREDIT_SCORE_MODEL_VERSIONS = 'V1' ; // current versions of the Credit Model

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

// adding the weights to to exisitng obligationPriority enum
export const PRIORITY_WEIGHTS: Record<ObligationPriority, number> = {
  LOW: 0.75,
  MEDIUM: 1.0,
  HIGH: 1.25,
  CRITICAL: 1.5
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