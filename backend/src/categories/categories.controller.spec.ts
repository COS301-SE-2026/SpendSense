jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: jest.Mocked<Pick<CategoriesService, 'listCategories'>>;

  beforeEach(() => {
    categoriesService = {
      listCategories: jest.fn(),
    };

    controller = new CategoriesController(
      categoriesService as unknown as CategoriesService,
    );
  });

  it('returns the categories from the service for the provided query', async () => {
    const query = { type: 'EXPENSE' as const };
    const categories = [
      {
        id: 'cat_food',
        name: 'Food',
        type: 'BOTH',
        iconKey: 'utensils',
        colourKey: 'red',
        isDefault: true,
      },
    ];

    categoriesService.listCategories.mockResolvedValue(categories);

    await expect(controller.listCategories(query)).resolves.toEqual(categories);
    expect(categoriesService.listCategories).toHaveBeenCalledWith(query);
  });
});
