import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RewardService } from '../rewards/reward.service';
import type { AuthUser } from '../auth/types/auth-user.type';

export interface CosmeticCatalogueItem {
  id: string;
  code: string;
  name: string;
  slot: string;
  cost: number;
  iconKey: string | null;
  equipped: boolean;
  owned: boolean;
}

@Injectable()
export class CosmeticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly rewardService: RewardService,
  ) {}

  async getCatalogue(authUser: AuthUser): Promise<CosmeticCatalogueItem[]> {
    const user = await this.usersService.findOrCreateUser(authUser);

    const items = await this.prisma.cosmeticItem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        inventoryItems: {
          where: { userId: user.id },
        },
      },
    });

    return items.map((item) => {
      const ownedRow = item.inventoryItems[0];

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        slot: item.slot,
        cost: item.cost,
        iconKey: item.iconKey,
        equipped: ownedRow?.equipped ?? false,
        owned: Boolean(ownedRow),
      };
    });
  }

  async equip(authUser: AuthUser, cosmeticId: string) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const cosmetic = await this.prisma.cosmeticItem.findFirst({
      where: {
        id: cosmeticId,
        isActive: true,
      },
    });

    if (!cosmetic) {
      throw new NotFoundException('Cosmetic item was not found');
    }

    const ownedItem = await this.prisma.userInventoryItem.findFirst({
      where: {
        userId: user.id,
        cosmeticItemId: cosmeticId,
      },
      include: {
        cosmeticItem: true,
      },
    });

    if (!ownedItem) {
      throw new BadRequestException('Cosmetic item is not owned');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.userInventoryItem.updateMany({
        where: {
          userId: user.id,
          equipped: true,
          cosmeticItemId: {
            not: cosmeticId,
          },
          cosmeticItem: {
            slot: ownedItem.cosmeticItem.slot,
          },
        },
        data: {
          equipped: false,
        },
      });

      await transaction.userInventoryItem.update({
        where: {
          id: ownedItem.id,
        },
        data: {
          equipped: true,
        },
      });

      return {
        id: cosmeticId,
        slot: ownedItem.cosmeticItem.slot,
        equipped: true,
      };
    });
  }

  async unequip(authUser: AuthUser, cosmeticId: string) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const cosmetic = await this.prisma.cosmeticItem.findFirst({
      where: {
        id: cosmeticId,
        isActive: true,
      },
    });

    if (!cosmetic) {
      throw new NotFoundException('Cosmetic item was not found');
    }

    const ownedItem = await this.prisma.userInventoryItem.findFirst({
      where: {
        userId: user.id,
        cosmeticItemId: cosmeticId,
        equipped: true,
      },
      include: {
        cosmeticItem: true,
      },
    });

    if (!ownedItem) {
      throw new BadRequestException('Cosmetic item is not equipped');
    }

    await this.prisma.userInventoryItem.update({
      where: {
        id: ownedItem.id,
      },
      data: {
        equipped: false,
      },
    });

    return {
      id: cosmeticId,
      slot: ownedItem.cosmeticItem.slot,
      equipped: false,
    };
  }

  async purchase(authUser: AuthUser, cosmeticId: string) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const cosmetic = await this.prisma.cosmeticItem.findFirst({
      where: {
        id: cosmeticId,
        isActive: true,
      },
    });

    if (!cosmetic) {
      throw new NotFoundException('Cosmetic item was not found');
    }

    const itemOwned = await this.prisma.userInventoryItem.findFirst({
      where: {
        userId: user.id,
        cosmeticItemId: cosmetic.id,
      },
    });

    if (itemOwned) {
      throw new BadRequestException('Cosmetic item already owned');
    }

    return this.prisma.$transaction(async (transaction) => {
      const { coinBalance } = await this.rewardService.spendCoins(transaction, {
        userId: user.id,
        amount: cosmetic.cost,
        reason: `Cosmetic purchase: ${cosmetic.name}`,
      });

      await transaction.userInventoryItem.create({
        data: {
          userId: user.id,
          cosmeticItemId: cosmetic.id,
        },
      });

      return {
        id: cosmetic.id,
        code: cosmetic.code,
        owned: true,
        coinBalance,
      };
    });
  }
}
