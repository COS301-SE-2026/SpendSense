import {
  seedSimulationCatalogue,
  simulationEventTemplates,
  simulationObligationTemplates,
  validateSimulationCatalogue,
} from '../../prisma/seed/simulation-catalogue';

describe('simulation catalogue seed', () => {
  it('contains a valid, sufficiently large pool of fictional content', () => {
    expect(() => validateSimulationCatalogue()).not.toThrow();
    expect(simulationObligationTemplates).toHaveLength(13);
    expect(simulationEventTemplates).toHaveLength(6);
    expect(simulationObligationTemplates).toContainEqual(
      expect.objectContaining({
        code: 'SIM_OBL_RENT',
        importance: 'CRITICAL',
        importanceWeight: 2.5,
      }),
    );
    expect(simulationObligationTemplates).toContainEqual(
      expect.objectContaining({
        code: 'SIM_OBL_FRIEND_IOU',
        amountDue: 100,
        importance: 'LOW',
        importanceWeight: 0.5,
      }),
    );
    for (const event of simulationEventTemplates) {
      expect(
        event.eventSnapshot.options.some(
          (candidate) =>
            Number(candidate.immediateCost) + Number(candidate.feeOrDebt) === 0,
        ),
      ).toBe(true);
    }
    expect(
      simulationObligationTemplates.filter(
        (obligation) => obligation.eligibleForEventIntroduction,
      ),
    ).not.toHaveLength(0);
  });

  it('authors truthful event cash, fee, and in-month bill consequences', () => {
    const findEvent = (code: string) =>
      simulationEventTemplates.find((event) => event.code === code)!;
    const findOption = (eventCode: string, optionId: string) =>
      findEvent(eventCode).eventSnapshot.options.find(
        (option) => option.id === optionId,
      )!;
    const introducedTemplate = (code: string) =>
      simulationObligationTemplates.find((item) => item.code === code)!;

    const car = findOption('SIM_EVT_URGENT_CAR_REPAIR', 'payment_plan');
    expect(car.immediateCost).toBe('150.00');
    expect(car.feeOrDebt).toBe('80.00');
    expect(car.scoreDelta).toBe('4.00');
    expect(car.explanation).toContain('R230 total');
    expect(car.explanation).toContain('R500 repayment bill');
    expect(
      introducedTemplate(car.introducedObligationTemplateCode!).dueDay,
    ).toBe(25);
    expect(Number(car.scoreDelta)).toBeLessThan(
      Number(findOption('SIM_EVT_URGENT_CAR_REPAIR', 'pay_now').scoreDelta),
    );

    const medical = findOption('SIM_EVT_MEDICAL_COST', 'payment_plan');
    expect(medical.explanation).toContain('R180 total');
    expect(medical.explanation).toContain('R450 repayment bill');
    expect(
      introducedTemplate(medical.introducedObligationTemplateCode!).dueDay,
    ).toBe(26);

    const loan = findOption('SIM_EVT_INCOME_SHORTFALL', 'borrow_short_term');
    expect(loan.explanation).toContain('R100 loan fee today');
    expect(loan.explanation).toContain('R350 family-loan repayment bill');

    for (const event of simulationEventTemplates) {
      expect(
        event.eventSnapshot.options.some(
          (option) =>
            Number(option.immediateCost) + Number(option.feeOrDebt) === 0,
        ),
      ).toBe(true);
      for (const option of event.eventSnapshot.options) {
        if (option.introducedObligationTemplateCode) {
          expect(
            introducedTemplate(option.introducedObligationTemplateCode).dueDay,
          ).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('upserts every template by its stable code', async () => {
    type UpsertInput = {
      where: { code: string };
      create: { code: string };
      update: { code: string };
    };
    type UpdateManyInput = {
      where: { code: { in: string[] } };
      data: { isActive: boolean };
    };
    const obligationUpsert = jest.fn<Promise<unknown>, [UpsertInput]>();
    const eventUpsert = jest.fn<Promise<unknown>, [UpsertInput]>();
    const obligationUpdateMany = jest.fn<Promise<unknown>, [UpdateManyInput]>();
    const eventUpdateMany = jest.fn<Promise<unknown>, [UpdateManyInput]>();
    const prisma = {
      simulationObligationTemplate: {
        upsert: obligationUpsert,
        updateMany: obligationUpdateMany,
      },
      simulationEventTemplate: {
        upsert: eventUpsert,
        updateMany: eventUpdateMany,
      },
    };

    await seedSimulationCatalogue(prisma);

    expect(obligationUpsert).toHaveBeenCalledTimes(
      simulationObligationTemplates.length,
    );
    expect(eventUpsert).toHaveBeenCalledTimes(simulationEventTemplates.length);
    const [obligationDeactivateCall] = obligationUpdateMany.mock.calls[0] ?? [];
    const [eventDeactivateCall] = eventUpdateMany.mock.calls[0] ?? [];
    expect(obligationDeactivateCall).toEqual({
      where: {
        code: {
          in: [
            'SIM_OBL_INSURANCE',
            'SIM_OBL_SCHOOL_SUPPLIES',
            'SIM_OBL_WATER',
            'SIM_OBL_CHILDCARE',
            'SIM_OBL_STREAMING',
            'SIM_OBL_GYM',
            'SIM_OBL_HOUSEHOLD_GOODS',
            'SIM_OBL_PET_CARE',
          ],
        },
      },
      data: { isActive: false },
    });
    expect(eventDeactivateCall).toEqual({
      where: {
        code: {
          in: [
            'SIM_EVT_DEVICE_REPLACEMENT',
            'SIM_EVT_COMMUNITY_COMMITMENT',
            'SIM_EVT_TRANSPORT_DISRUPTION',
            'SIM_EVT_SAVINGS_OPPORTUNITY',
          ],
        },
      },
      data: { isActive: false },
    });
    expect(
      obligationUpsert.mock.calls.some(
        ([call]) =>
          call.where.code === 'SIM_OBL_RENT' &&
          call.create.code === 'SIM_OBL_RENT' &&
          call.update.code === 'SIM_OBL_RENT',
      ),
    ).toBe(true);
    expect(
      eventUpsert.mock.calls.some(
        ([call]) =>
          call.where.code === 'SIM_EVT_URGENT_CAR_REPAIR' &&
          call.create.code === 'SIM_EVT_URGENT_CAR_REPAIR' &&
          call.update.code === 'SIM_EVT_URGENT_CAR_REPAIR',
      ),
    ).toBe(true);
  });
});
