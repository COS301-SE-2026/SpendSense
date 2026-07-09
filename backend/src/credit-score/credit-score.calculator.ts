
import { ScoreTier } from "@prisma/client";
import { CREDIT_SCORE_COMPONENT_WEIGHTS, CREDIT_SCORE_MODEL_VERSION, CREDIT_SCORE_RANGE, PRIORITY_WEIGHTS, RISK_CAPS } from './credit-score.constants';
import { PaymentHistoryItem } from "./credit-score.types";

function getPaymentOutcomeScore(payment: PaymentHistoryItem): number {

  if (payment.missed) return 0;
  if (payment.daysLate <= 0) return 1;
  if (payment.daysLate <= 3) return 0.85;
  if (payment.daysLate <= 7) return 0.7;
  if (payment.daysLate <= 14) return 0.5;
  if (payment.daysLate <= 30) return 0.25;

  return 0.05;
}

function getBudgetPressureScore(ratio : number): number {
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

function getConfidenceLevel(monthsWithPaymentHistory:number): ConfidenceLevel {
    if (monthsWithPaymentHistory < 3) return 'LOW';
    if (monthsWithPaymentHistory < 12) return 'MEDIUM';
    return 'HIGH';
}

function calculatePaymentHistoryScore(paymentHistoryItems: PaymentHistoryItem[]) : number {

    if (paymentHistoryItems.length === 0 ) {
        return 0.65 ; // apply Risk cap
    }

    let weightedTotal = 0 ;
    let totalWeight = 0 ;

    for (const payment of paymentHistoryItems) {
        const weight = PRIORITY_WEIGHTS[payment.priority] ;
        const score = getPaymentOutcomeScore(payment);
        weightedTotal += score * weight;
        totalWeight += weight;
    }

    return totalWeight === 0 ? 0.65 : weightedTotal / totalWeight;
}