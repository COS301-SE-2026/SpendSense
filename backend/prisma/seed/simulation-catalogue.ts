import {
  Prisma,
  SimulationObligationImportance,
  type PrismaClient,
} from '@prisma/client';

type SimulationCataloguePrisma = Pick<
  PrismaClient,
  'simulationObligationTemplate' | 'simulationEventTemplate'
>;

type EventOption = {
  id: string;
  label: string;
  immediateCost: string;
  feeOrDebt: string;
  scoreDelta: string;
  explanation: string;
  installmentSchedule?: Array<{
    templateCode: string;
    name: string;
    category: string;
    amountDue: string;
    dueDay: number;
    basePoints: string;
    savingsPointsFactor: string;
    importance: 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW';
    importanceWeight: string;
    baseMissPenalty: string;
  }>;
  introducedObligationTemplateCode?: string;
};

type SimulationEventTemplateSeed = Omit<
  Prisma.SimulationEventTemplateCreateInput,
  'eventSnapshot'
> & {
  eventSnapshot: {
    title: string;
    context: string;
    options: EventOption[];
    expiryOutcome: EventOption;
  };
};

function obligation(
  code: string,
  name: string,
  category: string,
  amountDue: number,
  dueDay: number,
  basePoints: number,
  selectionWeight: number,
  eligibleForEventIntroduction = false,
  scoring: {
    importance?: SimulationObligationImportance;
    importanceWeight?: number;
    baseMissPenalty?: number;
  } = {},
): Prisma.SimulationObligationTemplateCreateInput {
  return {
    code,
    name,
    category,
    amountDue,
    dueDay,
    basePoints,
    importance: scoring.importance ?? SimulationObligationImportance.STANDARD,
    importanceWeight: scoring.importanceWeight ?? 1,
    baseMissPenalty: scoring.baseMissPenalty ?? 20,
    selectionWeight,
    eligibleForEventIntroduction,
  };
}

function option(
  id: string,
  label: string,
  immediateCost: string,
  feeOrDebt: string,
  scoreDelta: string,
  explanation: string,
  introducedObligationTemplateCode?: string,
): EventOption {
  return {
    id,
    label,
    immediateCost,
    feeOrDebt,
    scoreDelta,
    explanation,
    ...(introducedObligationTemplateCode && {
      introducedObligationTemplateCode,
    }),
  };
}

function event(
  code: string,
  triggerDay: number,
  title: string,
  context: string,
  options: EventOption[],
  expiryOptionId: string,
  expiryExplanation: string,
  selectionWeight = 1,
): SimulationEventTemplateSeed {
  const expiryOption = options.find((item) => item.id === expiryOptionId);
  if (!expiryOption) {
    throw new Error(`Event ${code} has no expiry option ${expiryOptionId}.`);
  }

  return {
    code,
    triggerDay,
    selectionWeight,
    eventSnapshot: {
      title,
      context,
      options,
      expiryOutcome: { ...expiryOption, explanation: expiryExplanation },
    },
  };
}

export const simulationObligationTemplates = [
  obligation('SIM_OBL_RENT', 'Rent', 'Housing', 1800, 3, 60, 5, false, {
    importance: SimulationObligationImportance.CRITICAL,
    importanceWeight: 2.5,
  }),
  obligation(
    'SIM_OBL_GROCERIES',
    'Groceries',
    'Essentials',
    650,
    5,
    45,
    5,
    false,
    {
      importance: SimulationObligationImportance.HIGH,
      importanceWeight: 1.5,
    },
  ),
  obligation(
    'SIM_OBL_TRANSPORT',
    'Transport pass',
    'Transport',
    450,
    7,
    40,
    5,
    false,
    {
      importance: SimulationObligationImportance.HIGH,
      importanceWeight: 1.25,
    },
  ),
  obligation(
    'SIM_OBL_ELECTRICITY',
    'Electricity',
    'Utilities',
    420,
    9,
    40,
    4,
    false,
    {
      importance: SimulationObligationImportance.HIGH,
      importanceWeight: 1.25,
    },
  ),
  obligation(
    'SIM_OBL_PHONE',
    'Mobile plan',
    'Utilities',
    250,
    11,
    30,
    4,
    false,
    {
      importance: SimulationObligationImportance.STANDARD,
      importanceWeight: 1,
    },
  ),
  obligation(
    'SIM_OBL_INTERNET',
    'Home internet',
    'Utilities',
    400,
    14,
    35,
    3,
    false,
    {
      importance: SimulationObligationImportance.STANDARD,
      importanceWeight: 1,
    },
  ),
  obligation(
    'SIM_OBL_MEDICAL_AID',
    'Medical aid',
    'Health',
    550,
    15,
    50,
    3,
    false,
    {
      importance: SimulationObligationImportance.CRITICAL,
      importanceWeight: 2,
    },
  ),
  obligation(
    'SIM_OBL_DEBT_REPAYMENT',
    'Debt repayment',
    'Debt',
    600,
    19,
    50,
    3,
    false,
    { importance: SimulationObligationImportance.HIGH, importanceWeight: 1.5 },
  ),
  obligation(
    'SIM_OBL_CAR_REPAIR_REPAYMENT',
    'Car repair repayment',
    'Debt',
    500,
    25,
    35,
    1,
    true,
    { importance: SimulationObligationImportance.HIGH, importanceWeight: 1.5 },
  ),
  obligation(
    'SIM_OBL_MEDICAL_PAYMENT_PLAN',
    'Medical payment plan',
    'Health',
    450,
    26,
    35,
    1,
    true,
    { importance: SimulationObligationImportance.HIGH, importanceWeight: 1.5 },
  ),
  obligation(
    'SIM_OBL_FAMILY_LOAN_REPAYMENT',
    'Family loan repayment',
    'Debt',
    350,
    27,
    30,
    1,
    true,
    { importance: SimulationObligationImportance.LOW, importanceWeight: 0.6 },
  ),
  obligation(
    'SIM_OBL_HOME_REPAIR_REPAYMENT',
    'Home repair repayment',
    'Housing',
    550,
    28,
    35,
    1,
    true,
    { importance: SimulationObligationImportance.HIGH, importanceWeight: 1.5 },
  ),
  obligation(
    'SIM_OBL_FRIEND_IOU',
    'Coffee IOU to a friend',
    'Personal',
    100,
    18,
    10,
    1,
    false,
    { importance: SimulationObligationImportance.LOW, importanceWeight: 0.5 },
  ),
];

export const simulationEventTemplates: SimulationEventTemplateSeed[] = [
  event(
    'SIM_EVT_URGENT_CAR_REPAIR',
    4,
    'Urgent car repair',
    'Your usual transport needs a repair today. Compare the immediate cost with the reliability you need for the rest of the month.',
    [
      option(
        'pay_now',
        'Pay for the repair now',
        '600.00',
        '0.00',
        '12.00',
        'Pay R600 today and no fee; this avoids extra charges but reduces your buffer.',
      ),
      option(
        'payment_plan',
        'Use a payment plan',
        '150.00',
        '80.00',
        '4.00',
        'Pay R150 toward the repair plus an R80 fee today (R230 total). One R500 repayment bill is due on day 25 this month; no later-month bill is scheduled.',
        'SIM_OBL_CAR_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay the repair',
        '0.00',
        '150.00',
        '-12.00',
        'Pay no repair cost today. An R150 delay fee is charged today, for R150 cash required now.',
      ),
      option(
        'decline',
        'Decline and keep cash available',
        '0.00',
        '0.00',
        '-20.00',
        'No cost or fee is charged today; the transport problem remains unresolved.',
      ),
    ],
    'delay',
    'No decision was made in time. The repair was delayed and an R150 fee was charged today; no repayment bill was added.',
    3,
  ),
  event(
    'SIM_EVT_MEDICAL_COST',
    6,
    'Unexpected medical cost',
    'A clinic visit is needed today. The choice affects both available cash and future obligations.',
    [
      option(
        'pay_now',
        'Pay the clinic now',
        '500.00',
        '0.00',
        '12.00',
        'Pay R500 today and no fee; addressing this health need avoids future charges.',
      ),
      option(
        'payment_plan',
        'Agree to a payment plan',
        '120.00',
        '60.00',
        '3.00',
        'Pay a R120 deposit plus an R60 fee today (R180 total). One R450 repayment bill is due on day 26 this month; no later-month bill is scheduled.',
        'SIM_OBL_MEDICAL_PAYMENT_PLAN',
      ),
      option(
        'skip',
        'Skip the visit',
        '0.00',
        '180.00',
        '-15.00',
        'Pay no clinic cost today. An R180 skip fee is charged today, for R180 cash required now.',
      ),
      option(
        'decline',
        'Decline and preserve cash',
        '0.00',
        '0.00',
        '-25.00',
        'No cost or fee is charged today, but the health need remains unresolved.',
      ),
    ],
    'skip',
    'No decision was made in time. The clinic visit was skipped and an R180 fee was charged today; no repayment bill was added.',
    3,
  ),
  event(
    'SIM_EVT_FAMILY_REQUEST',
    8,
    'Family request',
    'A family member asks for help with an urgent household cost. Consider your own due obligations first.',
    [
      option(
        'help_full',
        'Help with the full amount',
        '400.00',
        '0.00',
        '6.00',
        'Pay R400 today with no fee; helping addresses the request but reduces your buffer.',
      ),
      option(
        'lend_small_amount',
        'Lend a smaller amount',
        '150.00',
        '0.00',
        '8.00',
        'Pay R150 today and add one R350 family-loan repayment bill due on day 27 this month.',
        'SIM_OBL_FAMILY_LOAN_REPAYMENT',
      ),
      option(
        'decline',
        'Decline and protect your budget',
        '0.00',
        '0.00',
        '4.00',
        'No cost or fee is charged today; protecting essential cash flow can be responsible.',
      ),
    ],
    'decline',
    'No decision was made in time. The request was declined with no cost or fee charged today.',
    2,
  ),
  event(
    'SIM_EVT_INCOME_SHORTFALL',
    10,
    'Income shortfall',
    'An expected side-income payment will arrive late. Decide how to protect urgent commitments.',
    [
      option(
        'reduce_discretionary',
        'Reduce discretionary spending',
        '0.00',
        '0.00',
        '10.00',
        'No cost or fee is charged today; reducing optional spending preserves funds for obligations.',
      ),
      option(
        'borrow_short_term',
        'Use a short-term loan',
        '0.00',
        '100.00',
        '-2.00',
        'Pay an R100 loan fee today (R100 cash required now) and add one R350 family-loan repayment bill due on day 27 this month.',
        'SIM_OBL_FAMILY_LOAN_REPAYMENT',
      ),
      option(
        'ignore',
        'Ignore the shortfall',
        '0.00',
        '140.00',
        '-12.00',
        'No cost is paid today; an R140 ignore fee is charged today, for R140 cash required now.',
      ),
    ],
    'ignore',
    'No decision was made in time. The shortfall was left unaddressed and an R140 fee was charged today.',
    2,
  ),
  event(
    'SIM_EVT_HOME_REPAIR',
    13,
    'Home repair',
    'A leaking tap needs attention before it causes more damage. The repair can be paid now or financed.',
    [
      option(
        'pay_now',
        'Pay for the repair now',
        '450.00',
        '0.00',
        '10.00',
        'Pay R450 today and no fee; paying now prevents a larger repair cost.',
      ),
      option(
        'finance',
        'Finance the repair',
        '100.00',
        '90.00',
        '2.00',
        'Pay a R100 deposit plus an R90 finance fee today (R190 total). One R550 repayment bill is due on day 28 this month; no later-month bill is scheduled.',
        'SIM_OBL_HOME_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay the repair',
        '0.00',
        '180.00',
        '-14.00',
        'Pay no repair cost today. An R180 delay fee is charged today, for R180 cash required now.',
      ),
      option(
        'defer',
        'Defer and protect current cash',
        '0.00',
        '0.00',
        '-20.00',
        'No cost or fee is charged today, but the leak remains unresolved.',
      ),
    ],
    'delay',
    'No decision was made in time. The repair was delayed and an R180 fee was charged today; no repayment bill was added.',
    2,
  ),
  event(
    'SIM_EVT_UTILITY_SPIKE',
    24,
    'Utility cost spike',
    'A higher-than-expected utility cost is due. Choose whether to pay, arrange a plan, or delay it.',
    [
      option(
        'pay_now',
        'Pay the utility cost now',
        '380.00',
        '0.00',
        '10.00',
        'Pay R380 today and no fee; paying this essential cost avoids a late charge.',
      ),
      option(
        'payment_plan',
        'Arrange a payment plan',
        '100.00',
        '75.00',
        '2.00',
        'Pay a R100 deposit plus an R75 fee today (R175 total). One R550 repayment bill is due on day 28 this month; no later-month bill is scheduled.',
        'SIM_OBL_HOME_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay payment',
        '0.00',
        '130.00',
        '-11.00',
        'Pay no utility cost today. An R130 delay fee is charged today, for R130 cash required now.',
      ),
      option(
        'request_extension',
        'Request an extension without paying today',
        '0.00',
        '0.00',
        '-8.00',
        'No cost or fee is charged today; the extension can carry a later consequence.',
      ),
    ],
    'delay',
    'No decision was made in time. The utility payment was delayed and an R130 fee was charged today; no repayment bill was added.',
    2,
  ),
];

const retiredInitialObligationCodes = [
  'SIM_OBL_INSURANCE',
  'SIM_OBL_SCHOOL_SUPPLIES',
  'SIM_OBL_WATER',
  'SIM_OBL_CHILDCARE',
  'SIM_OBL_STREAMING',
  'SIM_OBL_GYM',
  'SIM_OBL_HOUSEHOLD_GOODS',
  'SIM_OBL_PET_CARE',
];

const retiredInitialEventCodes = [
  'SIM_EVT_DEVICE_REPLACEMENT',
  'SIM_EVT_COMMUNITY_COMMITMENT',
  'SIM_EVT_TRANSPORT_DISRUPTION',
  'SIM_EVT_SAVINGS_OPPORTUNITY',
];

export function validateSimulationCatalogue(): void {
  const errors: string[] = [];
  const obligationCodes = new Set<string>();

  for (const obligation of simulationObligationTemplates) {
    if (obligationCodes.has(obligation.code)) {
      errors.push(`Duplicate obligation code: ${obligation.code}`);
    }
    obligationCodes.add(obligation.code);
    if (
      Number(obligation.amountDue) <= 0 ||
      Number(obligation.basePoints) <= 0
    ) {
      errors.push(
        `Obligation ${obligation.code} must have positive amount and points.`,
      );
    }
    if (obligation.dueDay < 1 || obligation.dueDay > 30) {
      errors.push(
        `Obligation ${obligation.code} must be due between days 1 and 30.`,
      );
    }
    if ((obligation.selectionWeight ?? 1) <= 0) {
      errors.push(`Obligation ${obligation.code} must have a positive weight.`);
    }
  }

  const eventCodes = new Set<string>();
  for (const event of simulationEventTemplates) {
    if (eventCodes.has(event.code)) {
      errors.push(`Duplicate event code: ${event.code}`);
    }
    eventCodes.add(event.code);
    if (event.triggerDay < 1 || event.triggerDay > 30) {
      errors.push(`Event ${event.code} must trigger between days 1 and 30.`);
    }
    if (
      (event.selectionWeight ?? 1) <= 0 ||
      event.eventSnapshot.options.length < 2
    ) {
      errors.push(
        `Event ${event.code} must have a positive weight and two options.`,
      );
    }
    if (!event.eventSnapshot.expiryOutcome.explanation) {
      errors.push(`Event ${event.code} must define an expiry explanation.`);
    }
  }

  if (
    simulationObligationTemplates.length < 5 ||
    simulationEventTemplates.length < 4
  ) {
    errors.push(
      'The catalogue needs at least five obligations and four events.',
    );
  }
  if (
    !simulationObligationTemplates.some(
      (item) => item.eligibleForEventIntroduction,
    )
  ) {
    errors.push(
      'At least one obligation must be eligible for event introduction.',
    );
  }
  if (errors.length > 0) {
    throw new Error(`Invalid simulation catalogue:\n${errors.join('\n')}`);
  }
}

export async function seedSimulationCatalogue(
  prisma: SimulationCataloguePrisma,
): Promise<void> {
  validateSimulationCatalogue();
  for (const obligation of simulationObligationTemplates) {
    await prisma.simulationObligationTemplate.upsert({
      where: { code: obligation.code },
      update: obligation,
      create: obligation,
    });
  }
  for (const event of simulationEventTemplates) {
    await prisma.simulationEventTemplate.upsert({
      where: { code: event.code },
      update: event,
      create: event,
    });
  }
  await prisma.simulationObligationTemplate.updateMany({
    where: { code: { in: retiredInitialObligationCodes } },
    data: { isActive: false },
  });
  await prisma.simulationEventTemplate.updateMany({
    where: { code: { in: retiredInitialEventCodes } },
    data: { isActive: false },
  });
}
