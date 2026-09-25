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
        'Paying now avoids extra charges but reduces your buffer.',
      ),
      option(
        'payment_plan',
        'Use a payment plan',
        '150.00',
        '80.00',
        '4.00',
        'The lower immediate cost creates a future repayment.',
        'SIM_OBL_CAR_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay the repair',
        '0.00',
        '150.00',
        '-12.00',
        'Delaying keeps cash today but adds a fee.',
      ),
      option(
        'decline',
        'Decline and keep cash available',
        '0.00',
        '0.00',
        '-20.00',
        'Declining avoids an immediate debit but leaves the transport problem unresolved.',
      ),
    ],
    'delay',
    'No decision was made in time, so the repair was delayed and a late cost was applied.',
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
        'Addressing a necessary health cost avoids future charges.',
      ),
      option(
        'payment_plan',
        'Agree to a payment plan',
        '120.00',
        '60.00',
        '3.00',
        'The plan reduces immediate pressure but creates a commitment.',
        'SIM_OBL_MEDICAL_PAYMENT_PLAN',
      ),
      option(
        'skip',
        'Skip the visit',
        '0.00',
        '180.00',
        '-15.00',
        'Skipping the urgent need creates a larger later consequence.',
      ),
      option(
        'decline',
        'Decline and preserve cash',
        '0.00',
        '0.00',
        '-25.00',
        'No cash is required, but the health need remains unresolved.',
      ),
    ],
    'skip',
    'No decision was made in time, so the clinic visit was missed and its consequence applied.',
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
        'Helping addresses the request but reduces your buffer.',
      ),
      option(
        'lend_small_amount',
        'Lend a smaller amount',
        '150.00',
        '0.00',
        '8.00',
        'A smaller contribution balances support with your own essentials.',
        'SIM_OBL_FAMILY_LOAN_REPAYMENT',
      ),
      option(
        'decline',
        'Decline and protect your budget',
        '0.00',
        '0.00',
        '4.00',
        'Protecting essential cash flow can be responsible.',
      ),
    ],
    'decline',
    'No decision was made in time, so the request was declined and the budget was unchanged.',
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
        'Reducing optional spending preserves funds for obligations.',
      ),
      option(
        'borrow_short_term',
        'Use a short-term loan',
        '0.00',
        '100.00',
        '-2.00',
        'Borrowing protects cash flow but introduces future cost.',
        'SIM_OBL_FAMILY_LOAN_REPAYMENT',
      ),
      option(
        'ignore',
        'Ignore the shortfall',
        '0.00',
        '140.00',
        '-12.00',
        'Ignoring a known shortfall risks avoidable costs.',
      ),
    ],
    'ignore',
    'No decision was made in time, so the income shortfall affected the budget without mitigation.',
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
        'Paying early prevents a larger repair cost.',
      ),
      option(
        'finance',
        'Finance the repair',
        '100.00',
        '90.00',
        '2.00',
        'Financing keeps cash now but raises the total cost.',
        'SIM_OBL_HOME_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay the repair',
        '0.00',
        '180.00',
        '-14.00',
        'Delaying a worsening repair risks a larger cost.',
      ),
      option(
        'defer',
        'Defer and protect current cash',
        '0.00',
        '0.00',
        '-20.00',
        'No cash is required now, but the leak remains unresolved.',
      ),
    ],
    'delay',
    'No decision was made in time, so the repair was delayed and the stated late cost applied.',
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
        'Paying an essential cost avoids a late charge.',
      ),
      option(
        'payment_plan',
        'Arrange a payment plan',
        '100.00',
        '75.00',
        '2.00',
        'The plan lowers today’s cost but creates a future repayment.',
        'SIM_OBL_HOME_REPAIR_REPAYMENT',
      ),
      option(
        'delay',
        'Delay payment',
        '0.00',
        '130.00',
        '-11.00',
        'Delaying an essential cost adds a penalty.',
      ),
      option(
        'request_extension',
        'Request an extension without paying today',
        '0.00',
        '0.00',
        '-8.00',
        'No cash is required now, but the extension can carry a later consequence.',
      ),
    ],
    'delay',
    'No decision was made in time, so the utility payment was delayed and the late cost applied.',
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
