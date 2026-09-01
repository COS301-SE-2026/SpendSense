import { DisplayNameAvailabilityController } from './display-name-availability.controller';
import { UsersService } from './users.service';

describe('DisplayNameAvailabilityController', () => {
  it('returns the availability result for a display name', async () => {
    const checkDisplayName = jest.fn().mockResolvedValue({ available: true });
    const usersService = {
      checkDisplayName,
    } as unknown as UsersService;
    const controller = new DisplayNameAvailabilityController(usersService);

    await expect(
      controller.checkAvailability({ displayName: 'New User' }),
    ).resolves.toEqual({ available: true });
    expect(checkDisplayName).toHaveBeenCalledWith('New User');
  });
});
