import { Get, Controller, UseGuards, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CosmeticsService } from './cosmetics.service';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('cosmetics')
@ApiBearerAuth()
@ApiTags('cosmetics')
@UseGuards(SupabaseJwtGuard)
export class CosmeticsController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @ApiOkResponse({
    description:
      "The  cosmetics catalogue, with the user's status for the items equip and owned status.",
    schema: {
      example: {
        data: [
          {
            id: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a',
            code: 'party_hat',
            name: 'Party Hat',
            slot: 'HAT',
            cost: 50,
            iconKey: 'hat_party',
            equipped: false,
            owned: false,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @ApiOperation({
    summary: 'Get the cosmetics catalogue',
    description:
      'Returns every cosmetic item, as well as if the user owns it or has it equipped.',
  })
  @Get()
  async getCatalogue(@CurrentAuthUser() authUser: AuthUser) {
    return this.cosmeticsService.getCatalogue(authUser);
  }
  @Patch(':id/equip')
  async equip(@CurrentAuthUser() authUser: AuthUser, @Param('id') id: string) {
    return this.cosmeticsService.equip(authUser, id);
  }
  @Patch(':id/unequip')
  async unequip(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.cosmeticsService.unequip(authUser, id);
  }
}
