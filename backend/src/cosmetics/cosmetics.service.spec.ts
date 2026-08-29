import { CosmeticsService } from './cosmetics.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  InsufficientCoinsException,
  RewardService,
} from '../rewards/reward.service';

describe('CosmeticsService', () => {
  let service: CosmeticsService;

  let prisma: {
    cosmeticItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    userInventoryItem: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let usersService: {
    findOrCreateUser: jest.Mock;
  };

  let transaction: {
    userInventoryItem: {
      updateMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };

  let rewardService: {
    spendCoins: jest.Mock;
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
        findFirst: jest.fn(),
      },
      userInventoryItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (_transaction: typeof transaction) => Promise<unknown>) =>
            callback(transaction),
        ),
    };

    transaction = {
      userInventoryItem: {
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    usersService = {
      findOrCreateUser: jest.fn(),
    };

    rewardService = {
      spendCoins: jest.fn(),
    };

    service = new CosmeticsService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
      rewardService as unknown as RewardService,
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

  describe('equip', () => {
    it('will equip item that the user owns', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.userInventoryItem.findFirst.mockResolvedValue({
        id: 'inventory-1',
        userId: user.id,
        cosmeticItemId: 'cosmetic-1',
        equipped: false,
        cosmeticItem: {
          id: 'cosmetic-1',
          slot: 'HAT',
          isActive: true,
        },
      });

      const result = await service.equip(authUser, 'cosmetic-1');

      expect(transaction.userInventoryItem.update).toHaveBeenCalledWith({
        where: {
          id: 'inventory-1',
        },
        data: {
          equipped: true,
        },
      });

      expect(result).toEqual({
        id: 'cosmetic-1',
        slot: 'HAT',
        equipped: true,
      });
    });

    it('will throw error when the user does not own the item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      await expect(service.equip(authUser, 'cosmetic-1')).rejects.toThrow(
        'Cosmetic item is not owned',
      );
    });

    it('will unequip the current item before equipping the new one', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.userInventoryItem.findFirst.mockResolvedValue({
        id: 'inventory-2',
        userId: user.id,
        cosmeticItemId: 'cosmetic-2',
        equipped: false,
        cosmeticItem: {
          id: 'cosmetic-2',
          slot: 'HAT',
          isActive: true,
        },
      });

      await service.equip(authUser, 'cosmetic-2');

      expect(transaction.userInventoryItem.updateMany).toHaveBeenCalledWith({
        where: {
          userId: user.id,
          equipped: true,
          cosmeticItem: {
            slot: 'HAT',
          },
        },
        data: {
          equipped: false,
        },
      });
    });
  });

  describe('unequip', () => {
    it('will unequip the currently equipped item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.userInventoryItem.findFirst.mockResolvedValue({
        id: 'inventory-1',
        userId: user.id,
        cosmeticItemId: 'cosmetic-1',
        equipped: true,
        cosmeticItem: {
          id: 'cosmetic-1',
          slot: 'HAT',
          isActive: true,
        },
      });

      const result = await service.unequip(authUser, 'cosmetic-1');

      expect(prisma.userInventoryItem.update).toHaveBeenCalledWith({
        where: {
          id: 'inventory-1',
        },
        data: {
          equipped: false,
        },
      });

      expect(result).toEqual({
        id: 'cosmetic-1',
        slot: 'HAT',
        equipped: false,
      });
    });

    it('will throw error when the item is not equipped currently', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      await expect(service.unequip(authUser, 'cosmetic-1')).rejects.toThrow(
        'Cosmetic item is not equipped',
      );
    });
  });

  describe('purchase', () => {
    it('will thrown an error when the user does not have enough coins for an item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue({
        id: 'cosmetic-1',
        code: 'party-hat',
        name: 'Party Hat',
        cost: 50,
        isActive: true,
      });

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      rewardService.spendCoins.mockRejectedValue(
        new InsufficientCoinsException(user.id, 50),
      );

      await expect(
        service.purchase(authUser, 'cosmetic-1'),
      ).rejects.toBeInstanceOf(InsufficientCoinsException);

      expect(transaction.userInventoryItem.create).not.toHaveBeenCalled();
    });

    it('will purchase a cosmetic and then return the new coin balance', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue({
        id: 'cosmetic-1',
        code: 'party-hat',
        name: 'Party Hat',
        cost: 50,
        isActive: true,
      });

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      rewardService.spendCoins.mockResolvedValue({
        coinBalance: 75,
      });

      transaction.userInventoryItem.create.mockResolvedValue({
        id: 'inventory-1',
        userId: user.id,
        cosmeticItemId: 'cosmetic-1',
        equipped: false,
      });

      const result = await service.purchase(authUser, 'cosmetic-1');

      expect(result).toEqual({
        id: 'cosmetic-1',
        code: 'party-hat',
        owned: true,
        coinBalance: 75,
      });
    });

    it('will create an inventory item after coins have been spent', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue({
        id: 'cosmetic-1',
        code: 'party-hat',
        name: 'Party Hat',
        cost: 50,
        isActive: true,
      });

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      rewardService.spendCoins.mockResolvedValue({
        coinBalance: 75,
      });

      transaction.userInventoryItem.create.mockResolvedValue({
        id: 'inventory-1',
        userId: user.id,
        cosmeticItemId: 'cosmetic-1',
        equipped: false,
      });

      await service.purchase(authUser, 'cosmetic-1');

      expect(transaction.userInventoryItem.create).toHaveBeenCalledWith({
        data: {
          userId: user.id,
          cosmeticItemId: 'cosmetic-1',
        },
      });

      expect(rewardService.spendCoins.mock.invocationCallOrder[0]).toBeLessThan(
        transaction.userInventoryItem.create.mock.invocationCallOrder[0],
      );
    });

    it('will throw an error when the user already owns the cosmetic item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue({
        id: 'cosmetic-1',
        code: 'party-hat',
        name: 'Party Hat',
        cost: 50,
        isActive: true,
      });

      prisma.userInventoryItem.findFirst.mockResolvedValue({
        id: 'inventory-1',
        userId: user.id,
        cosmeticItemId: 'cosmetic-1',
        equipped: false,
      });

      await expect(service.purchase(authUser, 'cosmetic-1')).rejects.toThrow(
        'Cosmetic item already owned',
      );

      expect(rewardService.spendCoins).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('will use the RewardService to use the coins for the cost of the cosmetic item', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue({
        id: 'cosmetic-1',
        code: 'party-hat',
        name: 'Party Hat',
        cost: 50,
        isActive: true,
      });

      prisma.userInventoryItem.findFirst.mockResolvedValue(null);

      rewardService.spendCoins.mockResolvedValue({
        coinBalance: 75,
      });

      transaction.userInventoryItem.create.mockResolvedValue({
        id: 'inventory-1',
      });

      await service.purchase(authUser, 'cosmetic-1');

      expect(rewardService.spendCoins).toHaveBeenCalledWith(transaction, {
        userId: user.id,
        amount: 50,
        reason: 'Cosmetic purchase: Party Hat',
      });

      expect(rewardService.spendCoins).toHaveBeenCalledTimes(1);
    });

    it('will throw an error when the item does not actually exist', async () => {
      usersService.findOrCreateUser.mockResolvedValue(user);

      prisma.cosmeticItem.findFirst.mockResolvedValue(null);

      await expect(service.purchase(authUser, 'cosmetic-1')).rejects.toThrow(
        'Cosmetic item was not found',
      );

      expect(prisma.userInventoryItem.findFirst).not.toHaveBeenCalled();
      expect(rewardService.spendCoins).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
