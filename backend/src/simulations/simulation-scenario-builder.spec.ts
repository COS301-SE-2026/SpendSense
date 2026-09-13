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

describe('buildSimulationScenario', () => {
  it('builds an affordable, resumable scenario with defaults and custom allocation rules', () => {
    const scenario = buildSimulationScenario({
      obligations: activeObligations,
      events: activeEvents,
      random: randomSequence([0, 0.99, 0.2, 0.4, 0.6, 0.8]),
    });

    expect(scenario.startingBudget).toBe('4000.00');
    expect(scenario.obligations.length).toBeGreaterThanOrEqual(5);
    expect(scenario.obligations.length).toBeLessThanOrEqual(7);
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
