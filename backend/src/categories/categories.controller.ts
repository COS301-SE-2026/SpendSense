import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CategoriesService } from './categories.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(SupabaseJwtGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({
    summary: 'List categories',
    description:
      'Returns seeded reference categories, optionally filtered by type.',
  })
  @Get()
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.listCategories(query);
  }
}
