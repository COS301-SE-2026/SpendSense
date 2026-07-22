export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface InsightCard {
  key:
    | 'on-time-rate'
    | 'obligation-trend'
    | 'upcoming-pressure'
    | 'category-breakdown'
    | 'payment-streak';
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

export interface PaymentPeriodStats {
  onTimePaymentCount: number;
  latePaymentCount: number;
  missedPaymentCount: number;
  eligiblePaymentCount: number;
  onTimePaymentPercentage: number;
}

export interface OnTimePaymentStats {
  currentPeriod: PaymentPeriodStats;
  previousPeriod: PaymentPeriodStats;
  percentagePointChange: number | null;
  hasEnoughData: boolean;
}

export interface ObligationTrendStats {
  currency: string;
  currentMonthAmount: number;
  previousMonthAmount: number;
  amountChange: number;
  percentageChange: number | null;
  hasEnoughData: boolean;
}

export interface UpcomingPressureStats {
  currency: string;
  windowDays: number;
  paymentCount: number;
  obligationCount: number;
  upcomingAmount: number;
  recentAverageWeeklyAmount: number;
  pressureRatio: number | null;
  nextDueDate: string | null;
  hasEnoughData: boolean;
}

export interface CategoryBreakdownItem {
  type: string;
  amount: number;
  percentage: number;
  occurrenceCount: number;
}

export interface CategoryBreakdownStats {
  currency: string;
  currentMonthTotal: number;
  breakdown: CategoryBreakdownItem[];
  dominantType: CategoryBreakdownItem | null;
  hasEnoughData: boolean;
}

export interface PaymentStreakStats {
  currentOnTimeStreak: number;
  longestOnTimeStreak: number;
  resolvedOutcomeCount: number;
  currentMonthOnTimeCount: number;
  currentMonthLateCount: number;
  currentMonthMissedCount: number;
  currentMonthOverdueCount: number;
  hasEnoughData: boolean;
}
