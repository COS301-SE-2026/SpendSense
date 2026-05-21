import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

export const categoryFilterValues = [
  CategoryType.OBLIGATION,
  CategoryType.EXPENSE,
  CategoryType.BOTH,
  'ALL',
] as const;

export type CategoryFilterValue = (typeof categoryFilterValues)[number];

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    enum: categoryFilterValues,
    description: 'Optional category filter. Defaults to ALL.',
  })
  @IsOptional()
  @IsIn(categoryFilterValues)
  type?: CategoryFilterValue;
}
