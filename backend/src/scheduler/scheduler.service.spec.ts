import { SchedulerService } from './scheduler.service';
import type { RemindersService } from '../reminders/reminders.service';
import type { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';

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

  beforeEach(() => {
    remindersService = {
      processDueReminders: jest.fn(),
    };

    paymentOccurrencesService = {
      transitionOverdueOccurrences: jest.fn(),
      transitionMissedOccurrence: jest.fn(),
    };

    service = new SchedulerService(
      remindersService as unknown as RemindersService,
      paymentOccurrencesService as unknown as PaymentOccurrencesService,
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
    it('run all three methods and then combine the counts', async () => {
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
      });
    });
  });
});
