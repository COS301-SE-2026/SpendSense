import {
  buildSimulationScenario,
  type CatalogueEvent,
  type CatalogueObligation,
} from './simulation-scenario-builder';
import {
  simulationEventTemplates,
  simulationObligationTemplates,
} from '../../prisma/seed/simulation-catalogue';

const activeObligations: CatalogueObligation[] =
  simulationObligationTemplates.map((item) => ({
    ...item,
    isActive: true,
  }));
const activeEvents: CatalogueEvent[] = simulationEventTemplates.map((item) => ({
  ...item,
  isActive: true,
}));

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0.5;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 48271) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

describe('buildSimulationScenario', () => {
  it('builds an affordable, resumable scenario with defaults and custom allocation rules', () => {
    const scenario = buildSimulationScenario({
      obligations: activeObligations,
      events: activeEvents,
      random: randomSequence([0, 0.99, 0.2, 0.4, 0.6, 0.8]),
    });

    expect(scenario.startingBudget).toBe('4000.00');
    expect(scenario.obligations).toHaveLength(5);
    const initialDueDays = scenario.obligations.map((item) => item.dueDay);
    expect(initialDueDays.some((day) => day <= 10)).toBe(true);
    expect(initialDueDays.some((day) => day >= 11 && day <= 20)).toBe(true);
    expect(initialDueDays.some((day) => day >= 21)).toBe(true);
    expect(scenario.events.length).toBeGreaterThanOrEqual(2);
    expect(scenario.events.length).toBeLessThanOrEqual(4);
    expect(
      scenario.obligations.reduce(
        (total, obligation) => total + Number(obligation.amountDue),
        0,
      ),
    ).toBeLessThanOrEqual(Number(scenario.initialObligationBudgetCap));
    expect(scenario.allocationOptions).toEqual([
      expect.objectContaining({ id: 'current_80_savings_20' }),
      expect.objectContaining({ id: 'current_70_savings_30' }),
      expect.objectContaining({ id: 'current_60_savings_40' }),
    ]);
    expect(scenario.customAllocation).toEqual({
      enabled: true,
      minCurrentAmount: '0.00',
      maxCurrentAmount: '4000.00',
      increment: '50.00',
    });
    expect(scenario.scenarioVersion).toBe('catalogue-v3');
  });

  it('always keeps the five-obligation count and due-day spread across random scenarios', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const scenario = buildSimulationScenario({
        obligations: activeObligations,
        events: activeEvents,
        random: seededRandom(seed),
      });
      const dueDays = scenario.obligations.map((item) => item.dueDay);

      expect(scenario.obligations).toHaveLength(5);
      expect(
        new Set(scenario.obligations.map((item) => item.templateCode)).size,
      ).toBe(5);
      expect(dueDays.some((day) => day <= 10)).toBe(true);
      expect(dueDays.some((day) => day >= 11 && day <= 20)).toBe(true);
      expect(dueDays.some((day) => day >= 21 && day <= 30)).toBe(true);
      expect(
        scenario.obligations.reduce(
          (total, obligation) => total + Number(obligation.amountDue),
          0,
        ),
      ).toBeLessThanOrEqual(Number(scenario.initialObligationBudgetCap));
    }
  });

  it('schedules hidden, distinct future obligations with stable snapshots and trigger days', () => {
    const firstScenario = buildSimulationScenario({
      obligations: activeObligations,
      events: activeEvents,
      random: randomSequence([0.5]),
    });
    const secondScenario = buildSimulationScenario({
      obligations: activeObligations,
      events: activeEvents,
      random: randomSequence([0.5]),
    });
    const initialCodes = new Set(
      firstScenario.obligations.map((item) => item.templateCode),
    );
    const scheduleKeys = firstScenario.obligationSchedules.map(
      (item) => item.scheduleKey,
    );
    const scheduledCodes = firstScenario.obligationSchedules.map(
      (item) => item.templateCode,
    );

    expect(firstScenario.obligationSchedules.length).toBeGreaterThanOrEqual(1);
    expect(firstScenario.obligationSchedules.length).toBeLessThanOrEqual(2);
    expect(new Set(scheduleKeys).size).toBe(scheduleKeys.length);
    expect(new Set(scheduledCodes).size).toBe(scheduledCodes.length);
    expect(scheduledCodes.every((code) => !initialCodes.has(code))).toBe(true);
    for (const schedule of firstScenario.obligationSchedules) {
      expect(schedule.triggerDay).toBeGreaterThanOrEqual(3);
      expect(schedule.triggerDay).toBeLessThanOrEqual(24);
      expect(schedule.obligationSnapshot.dueDay).toBeGreaterThan(
        schedule.triggerDay,
      );
      expect(schedule.obligationSnapshot.templateCode).toBe(
        schedule.templateCode,
      );
    }
    expect(secondScenario.obligationSchedules).toEqual(
      firstScenario.obligationSchedules,
    );
  });

  it('excludes inactive content and expands selected event obligations into snapshots', () => {
    const obligations = activeObligations.map((item) => ({
      ...item,
      isActive: item.code !== 'SIM_OBL_RENT',
    }));
    const events = activeEvents.map((item) => ({
      ...item,
      isActive: item.code !== 'SIM_EVT_FAMILY_REQUEST',
    }));
    const scenario = buildSimulationScenario({
      obligations,
      events,
      random: randomSequence([0.9, 0.9, 0.1, 0.3, 0.5, 0.7]),
    });

    expect(scenario.obligations.map((item) => item.templateCode)).not.toContain(
      'SIM_OBL_RENT',
    );
    expect(scenario.events.map((item) => item.templateCode)).not.toContain(
      'SIM_EVT_FAMILY_REQUEST',
    );
    const introducedObligation = scenario.events
      .flatMap((item) => item.eventSnapshot.options)
      .find((option) => option.introducedObligation)?.introducedObligation;
    expect(introducedObligation).toBeDefined();
    expect(introducedObligation?.templateCode).toBeTruthy();
  });

  it('preserves scoring metadata on event installments', () => {
    const installmentSchedule = [
      {
        templateCode: 'SIM_OBL_CAR_REPAIR_REPAYMENT',
        name: 'Car repair installment',
        category: 'Debt',
        amountDue: '350.00',
        dueDay: 15,
        basePoints: '35.00',
        savingsPointsFactor: '0.80',
        importance: 'HIGH',
        importanceWeight: '1.50',
        baseMissPenalty: '20.00',
      },
    ];
    const events = activeEvents.map((item) => {
      const snapshot = item.eventSnapshot as {
        options: Array<Record<string, unknown>>;
        expiryOutcome: Record<string, unknown>;
        [key: string]: unknown;
      };
      return {
        ...item,
        eventSnapshot: {
          ...snapshot,
          options: snapshot.options.map((option, index) =>
            index === 0 ? { ...option, installmentSchedule } : option,
          ),
        },
      };
    });
    const scenario = buildSimulationScenario({
      obligations: activeObligations,
      events,
      random: randomSequence([0.4, 0.1, 0.2, 0.3, 0.4, 0.5]),
    });

    expect(
      scenario.events
        .flatMap((item) => item.eventSnapshot.options)
        .some(
          (option) => option.installmentSchedule?.[0]?.importance === 'HIGH',
        ),
    ).toBe(true);
  });

  it('creates independent snapshots and rejects an insufficient catalogue', () => {
    const scenario = buildSimulationScenario({
      obligations: activeObligations,
      events: activeEvents,
      random: randomSequence([0.5]),
    });
    scenario.obligations[0].name = 'Changed only in this session';

    expect(simulationObligationTemplates[0].name).toBe('Rent');
    expect(() =>
      buildSimulationScenario({
        obligations: activeObligations.slice(0, 4),
        events: activeEvents,
      }),
    ).toThrow('Not enough active initial obligation templates.');
  });
});
