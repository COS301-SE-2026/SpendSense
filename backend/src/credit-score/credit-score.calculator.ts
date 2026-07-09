
import { ScoreTier } from "@prisma/client";
import { CREDIT_SCORE_COMPONENT_WEIGHTS, CREDIT_SCORE_MODEL_VERSION, CREDIT_SCORE_RANGE, PRIORITY_WEIGHTS, RISK_CAPS } from './credit-score.constants';

function calculatePaymentHistoryScore(PaymentHistoryItems: paymentHistoryItems[]) : number {
    if (paymentHistoryItems.length === 0 ) {
        return 0.65 ; // apply Risk cap
    }
    
}