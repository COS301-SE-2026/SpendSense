import { Injectable } from '@nestjs/common';
import { CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListCategoriesQueryDto,
  type CategoryFilterValue,
} from './dto/list-categories-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(query: ListCategoriesQueryDto) {
    const where = this.buildWhereClause(query.type);

    return this.prisma.category.findMany({
      where,
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
  }

  private buildWhereClause(
    type?: CategoryFilterValue,
  ): Prisma.CategoryWhereInput {
    switch (type) {
      case CategoryType.OBLIGATION:
        return {
          type: {
            in: [CategoryType.OBLIGATION, CategoryType.BOTH],
          },
        };
      case CategoryType.EXPENSE:
        return {
          type: {
            in: [CategoryType.EXPENSE, CategoryType.BOTH],
          },
        };
      case CategoryType.BOTH:
        return {
          type: CategoryType.BOTH,
        };
      case 'ALL':
      case undefined:
      default:
        return {};
    }
  }
}
