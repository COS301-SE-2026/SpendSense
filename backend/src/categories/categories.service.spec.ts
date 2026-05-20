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

  const expectedCategorySelect = {
    id: true,
    name: true,
    type: true,
    iconKey: true,
    colourKey: true,
    isDefault: true,
  };

  const expectedCategoryOrder = [{ isDefault: 'desc' }, { name: 'asc' }];

  it('returns all categories when no type filter is provided', async () => {
    const categories = [
      {
        id: 'cat_rent',
        name: 'Rent',
        type: CategoryType.OBLIGATION,
        iconKey: 'home',
        colourKey: 'blue',
        isDefault: true,
      },
      {
        id: 'cat_subscription',
        name: 'Subscription',
        type: CategoryType.BOTH,
        iconKey: 'repeat',
        colourKey: 'purple',
        isDefault: true,
      },
    ];

    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.listCategories({})).resolves.toEqual(categories);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });

  it('returns obligation-compatible categories for the OBLIGATION filter', async () => {
    await service.listCategories({ type: CategoryType.OBLIGATION });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        type: {
          in: [CategoryType.OBLIGATION, CategoryType.BOTH],
        },
      },
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });

  it('returns expense-compatible categories for the EXPENSE filter', async () => {
    await service.listCategories({ type: CategoryType.EXPENSE });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        type: {
          in: [CategoryType.EXPENSE, CategoryType.BOTH],
        },
      },
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });

  it('returns only shared categories for the BOTH filter', async () => {
    await service.listCategories({ type: CategoryType.BOTH });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        type: CategoryType.BOTH,
      },
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });

  it('returns all categories for the ALL filter', async () => {
    await service.listCategories({ type: 'ALL' });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });

  it('falls back to all categories for an unexpected filter value', async () => {
    await service.listCategories({ type: 'UNSUPPORTED' as never });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: expectedCategoryOrder,
      select: expectedCategorySelect,
    });
  });
});
