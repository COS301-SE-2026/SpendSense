import { SchedulerService } from './scheduler.service';
import type { RemindersService } from '../reminders/reminders.service';

describe('SchedulerService', () => {
  let remindersService: jest.Mocked<
    Pick<RemindersService, 'processDueReminders'>
  >;
  let service: SchedulerService;

  beforeEach(() => {
    remindersService = {
      processDueReminders: jest.fn(),
    };

    service = new SchedulerService(
      remindersService as unknown as RemindersService,
    );
  });

  it('will not throw when no reminders due to be processed', async () => {
    remindersService.processDueReminders.mockResolvedValue({
      processedCount: 0,
    });

    await expect(service.runScheduledJob()).resolves.not.toThrow();
  });

  it('will call processDueReminders when scheduled job runs', async () => {
    remindersService.processDueReminders.mockResolvedValue({
      processedCount: 3,
    });

    await service.runScheduledJob();

    expect(remindersService.processDueReminders).toHaveBeenCalledWith();
  });
});
