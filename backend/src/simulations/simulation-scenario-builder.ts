export type ObligationImportance = 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW';

export type CatalogueObligation = {
  code: string;
  name: string;
  category: string;
  amountDue: MoneyInput;
  dueDay: number;
  basePoints: MoneyInput;
  savingsPointsFactor?: MoneyInput;
  importance: ObligationImportance;
  importanceWeight: MoneyInput;
  baseMissPenalty: MoneyInput;
  selectionWeight: number;
  isActive: boolean;
  eligibleForEventIntroduction: boolean;
};

type MoneyInput = number | string | { toString(): string };

export type CatalogueEvent = {
  code: string;
  triggerDay: number;
  eventSnapshot: unknown;
  selectionWeight: number;
  isActive: boolean;
};

type EventOption = {
  id: string;
  label: string;
  immediateCost: string;
  feeOrDebt: string;
  scoreDelta: string;
  explanation: string;
  installmentSchedule?: SessionObligationSnapshot[];
  introducedObligationTemplateCode?: string;
  introducedObligation?: SessionObligationSnapshot;
};

type EventSnapshot = {
  title: string;
  context: string;
  options: EventOption[];
  expiryOutcome: EventOption;
};

export type SessionObligationSnapshot = {
  templateCode: string;
  name: string;
  category: string;
  amountDue: string;
  dueDay: number;
  basePoints: string;
  savingsPointsFactor: string;
  importance: ObligationImportance;
  importanceWeight: string;
  baseMissPenalty: string;
};

export type SimulationAllocationOption = {
  id: string;
  label: string;
  currentAmount: string;
  savingsAmount: string;
};

export type SimulationScenario = {
  scenarioVersion: string;
  startingBudget: string;
  initialObligationBudgetCap: string;
  allocationOptions: SimulationAllocationOption[];
  customAllocation: {
    enabled: true;
    minCurrentAmount: string;
    maxCurrentAmount: string;
    increment: string;
  };
  obligations: SessionObligationSnapshot[];
  events: Array<{
    templateCode: string;
    triggerDay: number;
    eventSnapshot: EventSnapshot;
  }>;
};

export type SimulationScenarioBuilderInput = {
  obligations: CatalogueObligation[];
  events: CatalogueEvent[];
  random?: () => number;
};

const STARTING_BUDGET_MIN_CENTS = 400_000;
const STARTING_BUDGET_MAX_CENTS = 700_000;
const STARTING_BUDGET_STEP_CENTS = 50_000;
const INITIAL_OBLIGATION_MINIMUM = 5;
const INITIAL_OBLIGATION_MAXIMUM = 7;
const INITIAL_OBLIGATION_CAP_PERCENT = 70;
const EVENT_MINIMUM = 2;
const EVENT_MAXIMUM = 4;
const CUSTOM_ALLOCATION_STEP_CENTS = 5_000;
const DEFAULT_CURRENT_PERCENTAGES = [80, 70, 60] as const;

export function buildSimulationScenario(
  input: SimulationScenarioBuilderInput,
): SimulationScenario {
  const random = input.random ?? Math.random;
  const activeObligations = input.obligations.filter((item) => item.isActive);
  const initialCandidates = activeObligations.filter(
    (item) => !item.eligibleForEventIntroduction,
  );
  const activeEvents = input.events.filter((item) => item.isActive);

  if (initialCandidates.length < INITIAL_OBLIGATION_MINIMUM) {
    throw new Error('Not enough active initial obligation templates.');
  }
  if (activeEvents.length < EVENT_MINIMUM) {
    throw new Error('Not enough active event templates.');
  }

  const startingBudgetCents = randomStartingBudget(random);
  const initialObligationCapCents = Math.floor(
    (startingBudgetCents * INITIAL_OBLIGATION_CAP_PERCENT) / 100,
  );
  const requestedObligationCount = randomInteger(
    INITIAL_OBLIGATION_MINIMUM,
    Math.min(INITIAL_OBLIGATION_MAXIMUM, initialCandidates.length),
    random,
  );
  const selectedObligations = selectObligationsWithinBudget(
    initialCandidates,
    requestedObligationCount,
    initialObligationCapCents,
    random,
  );
  const eventCount = randomInteger(
    EVENT_MINIMUM,
    Math.min(EVENT_MAXIMUM, activeEvents.length),
    random,
  );
  const selectedEvents = selectWeightedDistinct(
    activeEvents,
    eventCount,
    random,
  );
  const templatesByCode = new Map(
    activeObligations.map((item) => [item.code, item]),
  );

  return {
    scenarioVersion: 'catalogue-v2',
    startingBudget: centsToMoney(startingBudgetCents),
    initialObligationBudgetCap: centsToMoney(initialObligationCapCents),
    allocationOptions: buildAllocationOptions(startingBudgetCents),
    customAllocation: {
      enabled: true,
      minCurrentAmount: centsToMoney(0),
      maxCurrentAmount: centsToMoney(startingBudgetCents),
      increment: centsToMoney(CUSTOM_ALLOCATION_STEP_CENTS),
    },
    obligations: selectedObligations.map(toObligationSnapshot),
    events: selectedEvents.map((item) => ({
      templateCode: item.code,
      triggerDay: item.triggerDay,
      eventSnapshot: expandEventSnapshot(item.eventSnapshot, templatesByCode),
    })),
  };
}

function randomStartingBudget(random: () => number): number {
  const choices =
    (STARTING_BUDGET_MAX_CENTS - STARTING_BUDGET_MIN_CENTS) /
      STARTING_BUDGET_STEP_CENTS +
    1;
  return (
    STARTING_BUDGET_MIN_CENTS +
    randomInteger(0, choices - 1, random) * STARTING_BUDGET_STEP_CENTS
  );
}

function buildAllocationOptions(
  startingBudgetCents: number,
): SimulationAllocationOption[] {
  return DEFAULT_CURRENT_PERCENTAGES.map((currentPercentage) => {
    const currentCents = Math.round(
      (startingBudgetCents * currentPercentage) / 100,
    );
    const savingsCents = startingBudgetCents - currentCents;

    return {
      id: `current_${currentPercentage}_savings_${100 - currentPercentage}`,
      label: `${currentPercentage}% Current / ${100 - currentPercentage}% Savings`,
      currentAmount: centsToMoney(currentCents),
      savingsAmount: centsToMoney(savingsCents),
    };
  });
}

function selectObligationsWithinBudget(
  candidates: CatalogueObligation[],
  requestedCount: number,
  capCents: number,
  random: () => number,
): CatalogueObligation[] {
  for (
    let count = requestedCount;
    count >= INITIAL_OBLIGATION_MINIMUM;
    count -= 1
  ) {
    const selected: CatalogueObligation[] = [];
    let remaining = [...candidates];
    let totalCents = 0;

    while (selected.length < count) {
      const slotsAfterSelection = count - selected.length - 1;
      const viable = remaining.filter((candidate) => {
        const candidateCost = moneyToCents(candidate.amountDue);
        const remainingCheapestCost = remaining
          .filter((item) => item.code !== candidate.code)
          .map((item) => moneyToCents(item.amountDue))
          .sort((left, right) => left - right)
          .slice(0, slotsAfterSelection)
          .reduce((sum, amount) => sum + amount, 0);
        return totalCents + candidateCost + remainingCheapestCost <= capCents;
      });

      if (viable.length === 0) {
        break;
      }

      const chosen = selectWeightedDistinct(viable, 1, random)[0];
      if (!chosen) {
        break;
      }
      selected.push(chosen);
      totalCents += moneyToCents(chosen.amountDue);
      remaining = remaining.filter((item) => item.code !== chosen.code);
    }

    if (selected.length === count) {
      return selected;
    }
  }

  throw new Error(
    'Active obligation templates cannot provide five affordable initial obligations.',
  );
}

function selectWeightedDistinct<T extends { selectionWeight: number }>(
  candidates: T[],
  count: number,
  random: () => number,
): T[] {
  const remaining = [...candidates];
  const selected: T[] = [];

  while (selected.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce(
      (sum, item) => sum + item.selectionWeight,
      0,
    );
    if (totalWeight <= 0) {
      throw new Error('Catalogue selection weights must be positive.');
    }

    let cursor = normalizedRandom(random) * totalWeight;
    let selectedIndex = remaining.length - 1;
    for (let index = 0; index < remaining.length; index += 1) {
      cursor -= remaining[index].selectionWeight;
      if (cursor < 0) {
        selectedIndex = index;
        break;
      }
    }
    const [chosen] = remaining.splice(selectedIndex, 1);
    if (chosen) {
      selected.push(chosen);
    }
  }

  if (selected.length !== count) {
    throw new Error(
      'Catalogue does not contain enough distinct active entries.',
    );
  }
  return selected;
}

function expandEventSnapshot(
  snapshot: unknown,
  templatesByCode: Map<string, CatalogueObligation>,
): EventSnapshot {
  const parsed = parseEventSnapshot(snapshot);
  return {
    ...parsed,
    options: parsed.options.map((option) =>
      expandEventOption(option, templatesByCode),
    ),
    expiryOutcome: expandEventOption(parsed.expiryOutcome, templatesByCode),
  };
}

function expandEventOption(
  option: EventOption,
  templatesByCode: Map<string, CatalogueObligation>,
): EventOption {
  if (!option.introducedObligationTemplateCode) {
    return { ...option };
  }

  const template = templatesByCode.get(option.introducedObligationTemplateCode);
  if (!template || !template.eligibleForEventIntroduction) {
    throw new Error(
      `Event option references an unavailable obligation template: ${option.introducedObligationTemplateCode}.`,
    );
  }
  return {
    ...option,
    introducedObligation: toObligationSnapshot(template),
  };
}

function parseEventSnapshot(value: unknown): EventSnapshot {
  const record = asRecord(value, 'event snapshot');
  return {
    title: requiredString(record.title, 'event title'),
    context: requiredString(record.context, 'event context'),
    options: requiredArray(record.options, 'event options').map((item) =>
      parseEventOption(item),
    ),
    expiryOutcome: parseEventOption(record.expiryOutcome),
  };
}

function parseEventOption(value: unknown): EventOption {
  const record = asRecord(value, 'event option');
  const introducedObligationTemplateCode = optionalString(
    record.introducedObligationTemplateCode,
  );
  return {
    id: requiredString(record.id, 'event option id'),
    label: requiredString(record.label, 'event option label'),
    immediateCost: requiredMoney(record.immediateCost, 'event immediate cost'),
    feeOrDebt: requiredMoney(record.feeOrDebt, 'event fee or debt'),
    scoreDelta: requiredMoney(record.scoreDelta, 'event score delta'),
    explanation: requiredString(record.explanation, 'event explanation'),
    ...(record.installmentSchedule !== undefined && {
      installmentSchedule: requiredArray(
        record.installmentSchedule,
        'event installment schedule',
      ).map((item) => parseInstallmentSnapshot(item)),
    }),
    ...(introducedObligationTemplateCode && {
      introducedObligationTemplateCode,
    }),
  };
}

function parseInstallmentSnapshot(value: unknown): SessionObligationSnapshot {
  const record = asRecord(value, 'installment snapshot');
  const importance = record.importance;
  if (
    importance !== 'CRITICAL' &&
    importance !== 'HIGH' &&
    importance !== 'STANDARD' &&
    importance !== 'LOW'
  ) {
    throw new Error('Invalid installment importance.');
  }
  const dueDay = record.dueDay;
  if (typeof dueDay !== 'number' || !Number.isInteger(dueDay) || dueDay < 1) {
    throw new Error('Invalid installment due day.');
  }
  return {
    templateCode: requiredString(
      record.templateCode,
      'installment template code',
    ),
    name: requiredString(record.name, 'installment name'),
    category: requiredString(record.category, 'installment category'),
    amountDue: requiredMoney(record.amountDue, 'installment amount'),
    dueDay,
    basePoints: requiredMoney(record.basePoints, 'installment base points'),
    savingsPointsFactor: requiredMoney(
      record.savingsPointsFactor,
      'installment savings factor',
    ),
    importance,
    importanceWeight: requiredMoney(
      record.importanceWeight,
      'installment importance weight',
    ),
    baseMissPenalty: requiredMoney(
      record.baseMissPenalty,
      'installment base miss penalty',
    ),
  };
}

function toObligationSnapshot(
  template: CatalogueObligation,
): SessionObligationSnapshot {
  return {
    templateCode: template.code,
    name: template.name,
    category: template.category,
    amountDue: centsToMoney(moneyToCents(template.amountDue)),
    dueDay: template.dueDay,
    basePoints: centsToMoney(moneyToCents(template.basePoints)),
    savingsPointsFactor: Number(template.savingsPointsFactor ?? 0.8).toFixed(2),
    importance: template.importance,
    importanceWeight: centsToMoney(moneyToCents(template.importanceWeight)),
    baseMissPenalty: centsToMoney(moneyToCents(template.baseMissPenalty)),
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function requiredMoney(value: unknown, label: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Number(value))) {
    throw new Error(`Invalid ${label}.`);
  }
  return centsToMoney(moneyToCents(value));
}

function moneyToCents(value: MoneyInput): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error('Money values must be finite.');
  }
  return Math.round(amount * 100);
}

function centsToMoney(value: number): string {
  return (value / 100).toFixed(2);
}

function randomInteger(
  minimum: number,
  maximum: number,
  random: () => number,
): number {
  return (
    minimum + Math.floor(normalizedRandom(random) * (maximum - minimum + 1))
  );
}

function normalizedRandom(random: () => number): number {
  return Math.min(Math.max(random(), 0), 0.999_999_999);
}
