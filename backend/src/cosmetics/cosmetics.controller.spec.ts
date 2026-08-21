import { CosmeticsController } from './cosmetics.controller';
import { CosmeticsService } from './cosmetics.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('CosmeticsController', () => {
  let controller: CosmeticsController;

  let cosmeticsService: {
    getCatalogue: jest.Mock;
  };

  const authUser = {
    id: 'auth-user-1',
    email: 'test@example.com',
  } as unknown as AuthUser;

  beforeEach(() => {
    cosmeticsService = {
      getCatalogue: jest.fn(),
    };

    controller = new CosmeticsController(
      cosmeticsService as unknown as CosmeticsService,
    );
  });

  describe('getCatalogue', () => {
    it('will return the catalogue that the cosmetics service returns', async () => {
      const catalogue = [
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          owned: false,
          equipped: false,
        },
        {
          id: 'cosmetic-2',
          code: 'medal',
          name: 'Medal',
          slot: 'ACCESSORY',
          cost: 50,
          iconKey: 'acc_medal',
          owned: true,
          equipped: true,
        },
      ];

      cosmeticsService.getCatalogue.mockResolvedValue(catalogue);

      const result = await controller.getCatalogue(authUser);

      expect(result).toEqual(catalogue);
    });

    it('will call the cosmetics service with a user that has been authenticated', async () => {
      cosmeticsService.getCatalogue.mockResolvedValue([]);

      await controller.getCatalogue(authUser);

      expect(cosmeticsService.getCatalogue).toHaveBeenCalledWith(authUser);
      expect(cosmeticsService.getCatalogue).toHaveBeenCalledTimes(1);
    });

    it('will throw an error when the cosmetics service fails', async () => {
      const error = new Error('Database failure');

      cosmeticsService.getCatalogue.mockRejectedValue(error);

      await expect(controller.getCatalogue(authUser)).rejects.toThrow(
        'Database failure',
      );
    });
  });
});