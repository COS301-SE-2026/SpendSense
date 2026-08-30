import { SchedulerService } from './scheduler.service';
import type { RemindersService } from '../reminders/reminders.service';
import type { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('SchedulerService', () => {
  let remindersService: jest.Mocked<
    Pick<RemindersService, 'processDueReminders'>
  >;
  let service: SchedulerService;
  let paymentOccurrencesService: jest.Mocked<
    Pick<
      PaymentOccurrencesService,
      'transitionOverdueOccurrences' | 'transitionMissedOccurrence'
    >
  >;
  let prisma: {
    gamificationProfile: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    remindersService = {
      processDueReminders: jest.fn(),
    };

    paymentOccurrencesService = {
      transitionOverdueOccurrences: jest.fn(),
      transitionMissedOccurrence: jest.fn(),
    };

    prisma = {
      gamificationProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
    };

    service = new SchedulerService(
      remindersService as unknown as RemindersService,
      paymentOccurrencesService as unknown as PaymentOccurrencesService,
      prisma as unknown as PrismaService,
    );
  });

  describe('runScheduledJob', () => {
    it('will not throw when no reminders due to be processed', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 0,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 0,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 0,
      });

      await expect(service.runScheduledJob()).resolves.not.toThrow();
    });

    it('will call runAll when scheduled job runs', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 2,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 1,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 3,
      });

      await service.runScheduledJob();

      expect(
        paymentOccurrencesService.transitionOverdueOccurrences,
      ).toHaveBeenCalledWith();
      expect(
        paymentOccurrencesService.transitionMissedOccurrence,
      ).toHaveBeenCalledWith();
      expect(remindersService.processDueReminders).toHaveBeenCalledWith();
    });
  });

  describe('runAll', () => {
    it('run all scheduled methods and combine the counts', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 2,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 1,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 3,
      });

      const rslt = await service.runAll();

      expect(
        paymentOccurrencesService.transitionOverdueOccurrences,
      ).toHaveBeenCalledWith();
      expect(
        paymentOccurrencesService.transitionMissedOccurrence,
      ).toHaveBeenCalledWith();
      expect(remindersService.processDueReminders).toHaveBeenCalledWith();

      expect(rslt).toEqual({
        overdueTransitionedCount: 2,
        missedTransitionedCount: 1,
        processedCount: 3,
        mascotMoodsDecayedCount: 0,
      });
    });

    it('returns all the 0 counts when there is not anything to process', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 0,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 0,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 0,
      });

      const rslt = await service.runAll();

      expect(rslt).toEqual({
        overdueTransitionedCount: 0,
        missedTransitionedCount: 0,
        processedCount: 0,
        mascotMoodsDecayedCount: 0,
      });
    });
  });

  describe('decayMascotMoods', () => {
    const now = new Date('2026-08-30T12:00:00.000Z');

    it('will leave moods alone when they are not old enough to decay yet', async () => {
      prisma.gamificationProfile.findMany.mockResolvedValue([]);

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('will not decay the same mood again at a later time', async () => {
      const updatedAt = new Date('2026-08-29T12:00:00.000Z');

      prisma.gamificationProfile.findMany
        .mockResolvedValueOnce([
          {
            id: 'profile-1',
            mascotMood: 'CELEBRATING',
            mascotMoodUpdatedAt: updatedAt,
          },
        ])
        .mockResolvedValueOnce([]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const firstResult = await service.decayMascotMoods(now);
      const secondResult = await service.decayMascotMoods(
        new Date('2026-08-30T12:01:00.000Z'),
      );

      expect(firstResult).toBe(1);
      expect(secondResult).toBe(0);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledTimes(1);
    });

    it('will decay HAPPY STRESSED and SAD after 72 hours', async () => {
      const updatedAt = new Date('2026-08-27T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-happy',
          mascotMood: 'HAPPY',
          mascotMoodUpdatedAt: updatedAt,
        },
        {
          id: 'profile-stressed',
          mascotMood: 'STRESSED',
          mascotMoodUpdatedAt: updatedAt,
        },
        {
          id: 'profile-sad',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: updatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledTimes(3);

      expect(result).toBe(3);
    });

    it('will decay CELEBRATING after 24 hours', async () => {
      const updatedAt = new Date('2026-08-29T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-1',
          mascotMood: 'CELEBRATING',
          mascotMoodUpdatedAt: updatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              mascotMood: 'CELEBRATING',
              mascotMoodUpdatedAt: {
                lte: new Date('2026-08-29T12:00:00.000Z'),
              },
            },
            {
              mascotMood: {
                in: ['HAPPY', 'SAD', 'STRESSED'],
              },
              mascotMoodUpdatedAt: {
                lte: new Date('2026-08-27T12:00:00.000Z'),
              },
            },
          ],
        },
        select: {
          id: true,
          mascotMood: true,
          mascotMoodUpdatedAt: true,
        },
      });

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
          mascotMood: 'CELEBRATING',
          mascotMoodUpdatedAt: updatedAt,
        },
        data: {
          mascotMood: 'NEUTRAL',
          mascotMoodUpdatedAt: now,
        },
      });

      expect(result).toBe(1);
    });

    it('will not overwrite a new mascot reaction with an old decay', async () => {
      const oldUpdatedAt = new Date('2026-08-27T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-1',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: oldUpdatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: oldUpdatedAt,
        },
        data: {
          mascotMood: 'NEUTRAL',
          mascotMoodUpdatedAt: now,
        },
      });

      expect(result).toBe(0);
    });
  });
});
