import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
      'Returns seeded reference categories for the authenticated user flow. Use the optional type query to filter obligation, expense, both, or all categories.',
  })
  @ApiOkResponse({
    description:
      'Seeded reference categories, wrapped by the global response envelope.',
    schema: {
      example: {
        data: [
          {
            id: 'cat_rent',
            name: 'Rent',
            type: 'OBLIGATION',
            iconKey: 'home',
            colourKey: 'blue',
            isDefault: true,
          },
          {
            id: 'cat_subscription',
            name: 'Subscription',
            type: 'BOTH',
            iconKey: 'repeat',
            colourKey: 'purple',
            isDefault: true,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Get()
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.listCategories(query);
  }
}
