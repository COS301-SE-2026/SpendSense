import {
  CategoryBreakdownStats,
  InsightCard,
  InsightSeverity,
  ObligationTrendStats,
  OnTimePaymentStats,
  PaymentStreakStats,
  UpcomingPressureStats,
} from './insights.types';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-ZA').format(value);
}

function typeLabel(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function createOnTimePaymentInsight(
  stats: OnTimePaymentStats,
): InsightCard {
  if (!stats.hasEnoughData) {
    return {
      key: 'on-time-rate',
      title: 'On-time payment rate',
      value: 'Not enough data',
      explanation:
        'No completed or missed payments were recorded this month yet.',
      severity: 'info',
      // link: " ",
    };
  }

  const rate = stats.currentPeriod.onTimePaymentPercentage;
  let severity: InsightSeverity;

  if (rate >= 90) severity = 'positive';
  else if (rate >= 75) severity = 'info';
  else if (rate >= 50) severity = 'warning';
  else severity = 'critical';

  let trendText = 'No prior-month comparison is available yet.';
  if (stats.percentagePointChange !== null) {
    const change = stats.percentagePointChange;
    if (change === 0) {
      trendText = 'This is unchanged from last month.';
    } else {
      trendText = `${Math.abs(change)} percentage points ${
        change > 0 ? 'higher' : 'lower'
      } than last month.`;
    }
  }

  return {
    key: 'on-time-rate',
    title: 'On-time payment rate',
    value: `${rate}%`,
    explanation:
      `${stats.currentPeriod.onTimePaymentCount} of ` +
      `${stats.currentPeriod.eligiblePaymentCount} eligible payments were on time. ` +
      trendText,
    severity,
    // // link: "/payments",
  };
}

export function createObligationTrendInsight(
  stats: ObligationTrendStats,
): InsightCard {
  if (!stats.hasEnoughData) {
    return {
      key: 'obligation-trend',
      title: 'Monthly obligations',
      value: 'Not enough data',
      explanation:
        'There are no scheduled obligation amounts for this month or last month.',
      severity: 'info',
      // // link: "/obligations",
    };
  }

  let severity: InsightSeverity = 'info';
  let comparisonText: string;

  if (stats.previousMonthAmount === 0) {
    comparisonText = 'There is no previous-month total to compare against yet.';
  } else if (stats.percentageChange === 0) {
    comparisonText = 'Your committed amount is unchanged from last month.';
  } else {
    const direction = stats.amountChange > 0 ? 'up' : 'down';
    comparisonText = `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${Math.abs(stats.percentageChange ?? 0)}% (${formatMoney(Math.abs(stats.amountChange), stats.currency)}) from last month.`;
    if ((stats.percentageChange ?? 0) > 10) severity = 'warning';
    if ((stats.percentageChange ?? 0) < -10) severity = 'positive';
  }

  return {
    key: 'obligation-trend',
    title: 'Monthly obligations',
    value: formatMoney(stats.currentMonthAmount, stats.currency),
    explanation: comparisonText,
    severity,
    // link: "/obligations",
  };
}

export function createUpcomingPressureInsight(
  stats: UpcomingPressureStats,
): InsightCard {
  if (!stats.hasEnoughData) {
    return {
      key: 'upcoming-pressure',
      title: `Next ${stats.windowDays} days`,
      value: formatMoney(0, stats.currency),
      explanation: `No pending payments are due in the next ${stats.windowDays} days.`,
      severity: 'positive',
      // link: "/payments",
    };
  }

  let severity: InsightSeverity = 'info';
  let comparisonText =
    'There is not enough recent history for a pressure comparison.';

  if (stats.pressureRatio !== null) {
    if (stats.pressureRatio >= 1.5) severity = 'critical';
    else if (stats.pressureRatio >= 1.1) severity = 'warning';
    else if (stats.pressureRatio <= 0.75) severity = 'positive';

    const percentageOfNormal = Math.round(stats.pressureRatio * 100);
    comparisonText = `That is about ${percentageOfNormal}% of your recent average weekly commitments.`;
  }

  const paymentWord = stats.paymentCount === 1 ? 'payment' : 'payments';
  const obligationWord =
    stats.obligationCount === 1 ? 'obligation' : 'obligations';

  return {
    key: 'upcoming-pressure',
    title: `Next ${stats.windowDays} days`,
    value: formatMoney(stats.upcomingAmount, stats.currency),
    explanation:
      `${formatNumber(stats.paymentCount)} ${paymentWord} are due across ` +
      `${formatNumber(stats.obligationCount)} ${obligationWord}. ${comparisonText}`,
    severity,
    // // link: `/payment-occurrences/${id}`, // this should take the user to their payment ocurances - need to fix though
  };
}

export function createCategoryBreakdownInsight(
  stats: CategoryBreakdownStats,
): InsightCard {
  if (!stats.hasEnoughData || !stats.dominantType) {
    return {
      key: 'category-breakdown',
      title: 'Largest obligation type',
      value: 'Not enough data',
      explanation: 'No obligation amounts are scheduled for this month yet.',
      severity: 'info',
      // // link: "/obligations", this should take the user to their ob;igations
    };
  }

  const dominant = stats.dominantType;
  const label = typeLabel(dominant.type);

  return {
    key: 'category-breakdown',
    title: 'Largest obligation type',
    value: `${label} · ${dominant.percentage}%`,
    explanation: `${label} accounts for ${formatMoney(dominant.amount, stats.currency)} of ${formatMoney(stats.currentMonthTotal, stats.currency)} due this month.`,
    severity: 'info',
    //// link: "/obligations",
  };
}

export function createPaymentStreakInsight(
  stats: PaymentStreakStats,
): InsightCard {
  if (!stats.hasEnoughData) {
    return {
      key: 'payment-streak',
      title: 'Payment behaviour',
      value: 'Not enough data',
      explanation: 'Complete payments to begin building an on-time streak.',
      severity: 'info',
      //// link: "/payments",
    };
  }
  if (stats.currentMonthMissedCount > 0 || stats.currentMonthOverdueCount > 0) {
    return {
      key: 'payment-streak',
      title: 'Payment behaviour',
      value: `${stats.currentOnTimeStreak} on-time in a row`,
      explanation:
        `${stats.currentMonthMissedCount} missed and ` +
        `${stats.currentMonthOverdueCount} overdue payment(s) this month.`,
      severity: 'critical',
      // // link: "/payments",
    };
  }

  if (stats.currentMonthLateCount > 0) {
    return {
      key: 'payment-streak',
      title: 'Payment behaviour',
      value: `${stats.currentOnTimeStreak} on-time in a row`,
      explanation:
        `${stats.currentMonthLateCount} payment(s) were late this month. ` +
        `Your longest on-time streak is ${stats.longestOnTimeStreak}.`,
      severity: 'warning',
      // // link: "/payments",
    };
  }

  return {
    key: 'payment-streak',
    title: 'Payment behaviour',
    value: `${stats.currentOnTimeStreak} on-time in a row`,
    explanation:
      `${stats.currentMonthOnTimeCount} on-time payment(s) this month. ` +
      `Your longest streak is ${stats.longestOnTimeStreak}.`,
    severity: stats.currentOnTimeStreak >= 3 ? 'positive' : 'info',
    // // link: "/payments",
  };
}
