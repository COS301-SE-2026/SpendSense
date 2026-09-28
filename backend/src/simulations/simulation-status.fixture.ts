export function simulationStatusSession(
  now: Date,
  status: 'ACTIVE' | 'PAUSED',
  nextDayAt: Date | null,
  overrides: Record<string, unknown> = {},
) {
  return {
    status,
    timedMode: true,
    currentDay: 4,
    daysInMonth: 30,
    nextDayAt,
    startingBudget: '6000.00',
    currentBalance: '1000.00',
    savingsBalance: '1000.00',
    score: '48.00',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    presentationHold: 'NONE',
    scenarioSnapshot: {
      allocationOptions: [],
      customAllocation: {
        enabled: true,
        minCurrentAmount: '0.00',
        maxCurrentAmount: '6000.00',
        increment: '50.00',
      },
    },
    obligations: [],
    events: [],
    scoreEntries: [],
    ...overrides,
  };
}
