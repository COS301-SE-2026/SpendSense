export const GUIDANCE_WALKTHROUGH_MIN_STEP = 0;
export const GUIDANCE_WALKTHROUGH_MAX_STEP = 4;
export const MAX_DISMISSED_TIP_IDS = 30;
export const DISMISSIBLE_GUIDANCE_TIP_IDS = [
  'calendar.overdue.explainer',
] as const;
export const DISMISSIBLE_GUIDANCE_TIP_ID_SET = new Set<string>(
  DISMISSIBLE_GUIDANCE_TIP_IDS,
);
