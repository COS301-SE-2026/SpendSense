import { CategoryType, type PrismaClient } from '@prisma/client';

export const defaultCategories = [
  {
    name: 'Rent',
    type: CategoryType.OBLIGATION,
    iconKey: 'home',
    colourKey: 'blue',
    isDefault: true,
  },
  {
    name: 'Subscription',
    type: CategoryType.OBLIGATION,
    iconKey: 'repeat',
    colourKey: 'purple',
    isDefault: true,
  },
  {
    name: 'BNPL',
    type: CategoryType.OBLIGATION,
    iconKey: 'calendar-credit',
    colourKey: 'orange',
    isDefault: true,
  },
  {
    name: 'Utility',
    type: CategoryType.OBLIGATION,
    iconKey: 'bolt',
    colourKey: 'yellow',
    isDefault: true,
  },
  {
    name: 'IOU',
    type: CategoryType.OBLIGATION,
    iconKey: 'users',
    colourKey: 'green',
    isDefault: true,
  },
  {
    name: 'Transport',
    type: CategoryType.BOTH,
    iconKey: 'car',
    colourKey: 'gray',
    isDefault: true,
  },
  {
    name: 'Food',
    type: CategoryType.BOTH,
    iconKey: 'utensils',
    colourKey: 'red',
    isDefault: true,
  },
  {
    name: 'Education',
    type: CategoryType.BOTH,
    iconKey: 'book-open',
    colourKey: 'indigo',
    isDefault: true,
  },
  {
    name: 'Entertainment',
    type: CategoryType.BOTH,
    iconKey: 'ticket',
    colourKey: 'pink',
    isDefault: true,
  },
  {
    name: 'Custom',
    type: CategoryType.BOTH,
    iconKey: 'circle',
    colourKey: 'slate',
    isDefault: true,
  },
];

export async function seedCategories(prisma: PrismaClient) {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: category,
      create: category,
    });
  }
}
