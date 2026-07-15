
import { ScoreTier } from "@prisma/client";
import { CREDIT_SCORE_COMPONENT_WEIGHTS, CREDIT_SCORE_MODEL_VERSION, CREDIT_SCORE_RANGE, PRIORITY_WEIGHTS, RISK_CAPS, RISK_CAPS_REASONS } from './credit-score.constants';
import { ConfidenceLevel, PaymentHistoryItem, CreditScoreInput, CreditScoreResult } from "./credit-score.types";

// Getters for Various Ranges required for credit score calculations 
function getPaymentOutcomeScore(payment: PaymentHistoryItem): number {
    if (payment.missed) return 0;
    if (payment.daysLate <= 0) return 1;
    if (payment.daysLate <= 3) return 0.85;
    if (payment.daysLate <= 7) return 0.7;
    if (payment.daysLate <= 14) return 0.5;
    if (payment.daysLate <= 30) return 0.25;
    return 0.05;
}

function getBudgetPressureScore(ratio: number): number {
    if (ratio <= 0.5) return 1;
    if (ratio <= 0.7) return 0.75;
    if (ratio <= 0.9) return 0.5;
    if (ratio <= 1) return 0.2;
    return 0;
}

function getSavingsBufferScore(ratio: number): number {
    if (ratio >= 0.2) return 1;
    if (ratio >= 0.1) return 0.7;
    if (ratio >= 0) return 0.3;
    return 0;
}

function getScoreTier(score: number): ScoreTier {
    if (score <= 579) return ScoreTier.BUILDING;
    if (score <= 649) return ScoreTier.FAIR;
    if (score <= 719) return ScoreTier.GOOD;
    if (score <= 779) return ScoreTier.EXCELLENT;
    return ScoreTier.ELITE;
}

function getConfidenceLevel(monthsWithPaymentHistory: number): ConfidenceLevel {
    if (monthsWithPaymentHistory < 3) return 'LOW';
    if (monthsWithPaymentHistory < 12) return 'MEDIUM';
    return 'HIGH';
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function calculatePaymentHistoryScore(paymentHistoryItems: PaymentHistoryItem[]): number {

    if (paymentHistoryItems.length === 0) {
        return 0.65; // apply Risk cap
    }

    let weightedTotal = 0;
    let totalWeight = 0;

    for (const payment of paymentHistoryItems) {
        const weight = PRIORITY_WEIGHTS[payment.priority];
        const score = getPaymentOutcomeScore(payment);
        weightedTotal += score * weight;
        totalWeight += weight;
    }

    return totalWeight === 0 ? 0.65 : weightedTotal / totalWeight;
}

function calculateRiskCap(input: CreditScoreInput, budgetPressureRatio: number | null): { pointsCap: number, appliedCaps: string[] } {

    const caps: { cap: number, reason: string }[] = [];

    // CASE: No payment history
    if (input.paymentHistoryItems.length === 0) {
        caps.push({
            cap: RISK_CAPS.NO_PAYMENT_HISTORY,
            reason: RISK_CAPS_REASONS.NO_PAYMENT_HISTORY,
        });
    }

    // CASE: Exisiting overdue payments
    if (input.hasCurrentOverduePayment) {
        caps.push({
            cap: RISK_CAPS.CURRENT_OVERDUE_PAYMENT,
            reason: RISK_CAPS_REASONS.CURRENT_OVERDUE_PAYMENT,
        });
    }

    // CASE: EXISTING Two+ weeks late payment (largely outside any grace period)
    if (input.hasRecentLate15To30) {
        caps.push({
            cap: RISK_CAPS.RECENT_LATE_15_TO_30,
            reason: RISK_CAPS_REASONS.RECENT_LATE_15_TO_30,
        });
    }

    // CASE: Exisitng Missed payment
    if (input.hasRecentMissedPayment) {
        caps.push({
            cap: RISK_CAPS.RECENT_MISSED_PAYMENT,
            reason: RISK_CAPS_REASONS.RECENT_MISSED_PAYMENT,
        });
    }

    // CASE: Exisitng Missed Critical Obligation
    if (input.hasRecentMissedCriticalObligation) {
        caps.push({
            cap: RISK_CAPS.RECENT_MISSED_CRITICAL_OBLIGATION,
            reason: RISK_CAPS_REASONS.RECENT_MISSED_CRITICAL_OBLIGATION,
        });
    }

    // CASE: Over budget
    if (budgetPressureRatio !== null && budgetPressureRatio > 1) {
        caps.push({
            cap: RISK_CAPS.OVER_BUDGET,
            reason: RISK_CAPS_REASONS.OVER_BUDGET,
        });
    }

    // Otherwise no risk caps appliable 
    if (caps.length === 0) {
        return {
            pointsCap: RISK_CAPS.NONE,
            appliedCaps: [],
        };
    }

    const strictestCap = caps.reduce((lowest, current) => current.cap < lowest.cap ? current : lowest);
    return {
        pointsCap: strictestCap.cap,
        appliedCaps: caps.map((cap) => cap.reason),
    }

}

export function calculateSpendSenseScore(input: CreditScoreInput): CreditScoreResult {

    const paymentHistoryScore = calculatePaymentHistoryScore(input.paymentHistoryItems);

    let obligationDiversityScore = Math.min(input.successfullyManagedTypes / 3, 1)

    if (paymentHistoryScore < 0.5) {
        obligationDiversityScore = Math.min(obligationDiversityScore, 0.4);
    }

    const budgetDataAvailable = (input.monthlyBudget !== null) && (input.monthlyBudget > 0);
    const budgetPressureRatio = budgetDataAvailable ? input.monthlyCommittedObligations / input.monthlyBudget! : null;

    const savingsBufferRatio = budgetDataAvailable ? (input.monthlyBudget! - input.monthlyCommittedObligations) / input.monthlyBudget! : null;

    const budgetPressureScore = budgetDataAvailable ? getBudgetPressureScore(budgetPressureRatio!) : 0.5;

    const savingsBufferScore = budgetDataAvailable ? getSavingsBufferScore(savingsBufferRatio!) : 0.5;

    const historyLengthScore = Math.min(input.monthsWithPaymentHistory / 24, 1);


    const healthIndex =
        CREDIT_SCORE_COMPONENT_WEIGHTS.PAYMENT_HISTORY * paymentHistoryScore +
        CREDIT_SCORE_COMPONENT_WEIGHTS.BUDGET_PRESSURE * budgetPressureScore +
        CREDIT_SCORE_COMPONENT_WEIGHTS.SAVINGS_BUFFER * savingsBufferScore +
        CREDIT_SCORE_COMPONENT_WEIGHTS.HISTORY_LENGTH * historyLengthScore +
        CREDIT_SCORE_COMPONENT_WEIGHTS.OBLIGATION_DIVERSITY *
        obligationDiversityScore;

    const calculatedScore = Math.round(CREDIT_SCORE_RANGE.MIN + CREDIT_SCORE_RANGE.RANGE * healthIndex,);

    const { pointsCap, appliedCaps } = calculateRiskCap(input, budgetPressureRatio);

    const finalScore = Math.min(calculatedScore, pointsCap);

    return {
        modelVersion: CREDIT_SCORE_MODEL_VERSION,
        calculatedScore,
        finalScore,
        scoreTier: getScoreTier(finalScore),
        pointsCap,
        appliedCaps,
        confidence: getConfidenceLevel(input.monthsWithPaymentHistory),
        components: {
            paymentHistoryScore: round(paymentHistoryScore),
            budgetPressureScore: round(budgetPressureScore),
            savingsBufferScore: round(savingsBufferScore),
            historyLengthScore: round(historyLengthScore),
            obligationDiversityScore: round(obligationDiversityScore),
            healthIndex: round(healthIndex),
            budgetPressureRatio:
                budgetPressureRatio === null ? null : round(budgetPressureRatio),
            savingsBufferRatio:
                savingsBufferRatio === null ? null : round(savingsBufferRatio),
            monthlyCommittedObligations: roundMoney(
                input.monthlyCommittedObligations,
            ),
            monthlyBudget: input.monthlyBudget,
            monthsWithPaymentHistory: input.monthsWithPaymentHistory,
            successfullyManagedTypes: input.successfullyManagedTypes,
        },
    };
}