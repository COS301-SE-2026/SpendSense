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
