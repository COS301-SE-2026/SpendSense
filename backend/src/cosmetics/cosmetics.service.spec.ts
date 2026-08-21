import { CosmeticsService } from './cosmetics.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('CosmeticsService', () => {
  let service: CosmeticsService;

  let prisma: {
    cosmeticItem: {
      findMany: jest.Mock;
    };
  };

  let usersService: {
    findOrCreateUser: jest.Mock;
  };

  const authUser = {
    id: 'auth-user-1',
    email: 'test@example.com',
  } as unknown as AuthUser;

  const user = {
    id: 'user-1',
  };

  beforeEach(() => {
    prisma = {
      cosmeticItem: {
        findMany: jest.fn(),
      },
    };

    usersService = {
      findOrCreateUser: jest.fn(),
    };

    service = new CosmeticsService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  describe('getCatalogue', () => {
    it('will find the user from the authenticated user', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);
      prisma.cosmeticItem.findMany.mockResolvedValue([]);

      await service.getCatalogue(authUser);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(usersService.findOrCreateUser).toHaveBeenCalledTimes(1);
    });

    it('will mark an item as unequipped and unowned when the user does not own the item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findMany.mockResolvedValue([
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          createdAt: new Date(),
          isActive: true,
          inventoryItems: [],
        },
      ]);

      const result = await service.getCatalogue(authUser);

      expect(result).toEqual([
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          equipped: false,
          owned: false,
        },
      ]);
    });

    it('will mark an item as owned but unequipped if the user owns the item and is not wearing it', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findMany.mockResolvedValue([
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          createdAt: new Date(),
          isActive: true,
          inventoryItems: [
            {
              id: 'inventory-1',
              userId: user.id,
              cosmeticItemId: 'cosmetic-1',
              equipped: false,
            },
          ],
        },
      ]);

      const result = await service.getCatalogue(authUser);

      expect(result[0]).toEqual({
        id: 'cosmetic-1',
        code: 'party_hat',
        name: 'Party Hat',
        slot: 'HAT',
        cost: 50,
        iconKey: 'hat_party',
        equipped: false,
        owned: true,
      });
    });
    
    it('will fetch the active cosmetic items with the users inventory status for those items', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);
      prisma.cosmeticItem.findMany.mockResolvedValue([]);

      await service.getCatalogue(authUser);

      expect(prisma.cosmeticItem.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          inventoryItems: {
            where: { userId: user.id },
          },
        },
      });
    });

    it('will mark an item as owned and equipped when user is wearing the item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findMany.mockResolvedValue([
        {
          id: 'cosmetic-1',
          code: 'medal',
          name: 'Medal',
          slot: 'ACCESSORY',
          cost: 50,
          iconKey: 'acc_medal',
          createdAt: new Date(),
          isActive: true,
          inventoryItems: [
            {
              id: 'inventory-1',
              userId: user.id,
              cosmeticItemId: 'cosmetic-1',
              equipped: true,
            },
          ],
        },
      ]);

      const result = await service.getCatalogue(authUser);

      expect(result[0]).toEqual({
        id: 'cosmetic-1',
        code: 'medal',
        name: 'Medal',
        slot: 'ACCESSORY',
        cost: 50,
        iconKey: 'acc_medal',
        equipped: true,
        owned: true,
      });
    });

    it('will return the correct equipped and owned status for the cosmetics items', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findMany.mockResolvedValue([
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          createdAt: new Date('2026-01-01'),
          isActive: true,
          inventoryItems: [],
        },
        {
          id: 'cosmetic-2',
          code: 'medal',
          name: 'Medal',
          slot: 'ACCESSORY',
          cost: 50,
          iconKey: 'acc_medal',
          createdAt: new Date('2026-01-02'),
          isActive: true,
          inventoryItems: [
            {
              id: 'inventory-1',
              userId: user.id,
              cosmeticItemId: 'cosmetic-2',
              equipped: true,
            },
          ],
        },
      ]);

      const result = await service.getCatalogue(authUser);

      expect(result).toEqual([
        {
          id: 'cosmetic-1',
          code: 'party_hat',
          name: 'Party Hat',
          slot: 'HAT',
          cost: 50,
          iconKey: 'hat_party',
          equipped: false,
          owned: false,
        },
        {
          id: 'cosmetic-2',
          code: 'medal',
          name: 'Medal',
          slot: 'ACCESSORY',
          cost: 50,
          iconKey: 'acc_medal',
          equipped: true,
          owned: true,
        },
      ]);
    });

    it('will return an empty catalogue when there are no cosmetic items active', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);
      prisma.cosmeticItem.findMany.mockResolvedValue([]);

      const result = await service.getCatalogue(authUser);

      expect(result).toEqual([]);
    });
  });
});