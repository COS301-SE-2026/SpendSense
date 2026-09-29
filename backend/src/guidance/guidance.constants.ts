export const GUIDANCE_WALKTHROUGH_MIN_STEP = 0;
export const GUIDANCE_WALKTHROUGH_MAX_STEP = 4;
export const MAX_DISMISSED_TIP_IDS = 30;

export const DISMISSIBLE_GUIDANCE_TIP_IDS = [
  'dashboard.daily.nothing-recorded',
  'dashboard.daily.recorded-quiz-complete',
  'dashboard.daily.recorded-quiz-waiting',
  'dashboard.daily.up-to-date',
  'calendar.empty.no-obligations',
  'calendar.overdue.explainer',
  'calendar.occurrence.partial-balance',
  'calendar.occurrence.payable',
  'payment.result.partial',
  'payment.reward.on-time-score',
  'payment.reward.on-time-xp',
  'obligation.created',
  'payment.result.final-on-time',
  'payment.result.final-late',
  'payment.receipt.review',
  'friends.request.accepted',
  'friends.request.sent',
  'quiz.session.completed',
  'quiz.topic.completed',
  'quiz.daily.in-progress',
  'quiz.daily.available',
  'insights.upcoming-pressure.elevated',
  'insights.obligation-trend.increase',
  'insights.on-time-rate.value',
  'insights.on-time-rate.insufficient',
  'insights.payment-streak.positive',
  'insights.upcoming-pressure.steady',
  'insights.category-breakdown',
  'insights.empty',
] as const;

export const DISMISSIBLE_GUIDANCE_TIP_ID_SET = new Set<string>(
  DISMISSIBLE_GUIDANCE_TIP_IDS,
);
