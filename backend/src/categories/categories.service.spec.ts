import { CategoryType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('returns all categories when no type filter is provided', async () => {
    await service.listCategories({});

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        iconKey: true,
        colourKey: true,
        isDefault: true,
      },
    });
  });

  it('returns obligation-compatible categories for the OBLIGATION filter', async () => {
    await service.listCategories({ type: CategoryType.OBLIGATION });

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: {
            in: [CategoryType.OBLIGATION, CategoryType.BOTH],
          },
        },
      }),
    );
  });

  it('returns expense-compatible categories for the EXPENSE filter', async () => {
    await service.listCategories({ type: CategoryType.EXPENSE });

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: {
            in: [CategoryType.EXPENSE, CategoryType.BOTH],
          },
        },
      }),
    );
  });

  it('returns only shared categories for the BOTH filter', async () => {
    await service.listCategories({ type: CategoryType.BOTH });

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: CategoryType.BOTH,
        },
      }),
    );
  });

  it('returns all categories for the ALL filter', async () => {
    await service.listCategories({ type: 'ALL' });

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });
});
