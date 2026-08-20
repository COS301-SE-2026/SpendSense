import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
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
}
