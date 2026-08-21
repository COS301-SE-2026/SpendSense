import { CosmeticsController } from './cosmetics.controller';
import { CosmeticsService } from './cosmetics.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { itxClientDenyList, JsonObject } from '@prisma/client/runtime/client';

describe('CosmeticsController', () => {
  let controller: CosmeticsController;

  let cosmeticsService: {
    getCatalogue: jest.Mock;
    equip: jest.Mock;
    unequip: jest.Mock;
  };

  const authUser = {
    id: 'auth-user-1',
    email: 'test@example.com',
  } as unknown as AuthUser;

  beforeEach(() => {
    cosmeticsService = {
      getCatalogue: jest.fn(),
      equip: jest.fn(),
      unequip: jest.fn();
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

  describe('equip', () => {
    it('will call the cosmetics service in order to equip an item', async () => {
        cosmeticsService.equip.mockResolvedValue({
            id: 'cosmetic-1',
            slot: 'HAT',
            equipped: true,
        });

        await controller.equip(authUser, 'cosmetic-1');

        expect(cosmeticsService.equip).toHaveBeenCalledWith(
            authUser,
            'cosmetic-1',
        );
        expect(cosmeticsService.equip).toHaveBeenCalledTimes(1);
    });

    it('will throw error when equipping fails', async () => {
        cosmeticsService.equip.mockRejectedValue(
            new Error('Equip has failed'),
        );

        await expect(
            controller.equip(authUser, 'cosmetic-1'),
        ).rejects.toThrow('Equip has failed');
    });

    it('will return the cosmetic items that is equipped', async () => {
        const itemEquipped = {
            id: 'cosmetic-1',
            slot: 'HAT',
            equipped: true,
        };

        cosmeticsService.equip.mockResolvedValue(itemEquipped);

        const result = await controller.equip(authUser, 'cosmetic-1');
        expect(result).toEqual(itemEquipped);
    });
  });

  describe('unequip', () => {
    it('will call the cosmetics service in order to unequip an item', async () => {
        cosmeticsService.unequip.mockResolvedValue({
            id: 'cosmetic-1',
            slot: 'HAT',
            equipped: false,
        });

        await controller.unequip(authUser, 'cosmetic-1');

        expect(cosmeticsService.unequip).toHaveBeenCalledWith(
            authUser,
            'cosmetic-1',
        );
        expect(cosmeticsService.unequip).toHaveBeenCalledTimes(1);
    });

    it('will throw error when unequipping fails', async () => {
        cosmeticsService.unequip.mockRejectedValue(
            new Error('Unequip has failed'),
        );

        await expect(
            controller.unequip(authUser, 'cosmetic-1'),
        ).rejects.toThrow('Unequip has failed');
    });

    it('will return unequipped cosmetic items', async () => {
        const itemUnequipped = {
            id: 'cosmetic-1',
            slot: 'HAT',
            equipped: false,
        };

        cosmeticsService.unequip.mockResolvedValue(itemUnequipped);

        const result = await controller.unequip(authUser, 'cosmetic-1');
        expect(result).toEqual(itemUnequipped);
    });
  });
});