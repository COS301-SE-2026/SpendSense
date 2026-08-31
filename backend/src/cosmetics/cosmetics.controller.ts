import { Get, Controller, UseGuards, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
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

  @ApiOperation({
    summary: 'Equip a cosmetic item',
    description:
      'Equips an owned cosmetic item, and unequips any item applied in the same slot.',
  })
  @ApiOkResponse({
    description: 'The cosmetic item was equipped successfully.',
    schema: {
      example: {
        data: {
          id: 'hat-1-id',
          slot: 'HAT',
          equipped: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The cosmetic item is not owned by the user.',
  })
  @ApiNotFoundResponse({
    description: 'The cosmetic item does not exist.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @Patch(':id/equip')
  async equip(@CurrentAuthUser() authUser: AuthUser, @Param('id') id: string) {
    return this.cosmeticsService.equip(authUser, id);
  }

  @ApiOperation({
    summary: 'Unequip a cosmetic item',
    description:
      'Unequips an active cosmetic item that is currently equipped by the user.',
  })
  @ApiOkResponse({
    description: 'The cosmetic item was unequipped successfully.',
    schema: {
      example: {
        data: {
          id: 'hat-1-id',
          slot: 'HAT',
          equipped: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The cosmetic item is not currently equipped.',
  })
  @ApiNotFoundResponse({
    description: 'The cosmetic item does not exist.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @Patch(':id/unequip')
  async unequip(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.cosmeticsService.unequip(authUser, id);
  }

  @ApiOperation({
    summary: 'Purchase a cosmetic item',
    description:
      'Purchases a cosmetic item using the current users coin balance.',
  })
  @ApiOkResponse({
    description: 'The cosmetic item was purchased successfully.',
    schema: {
      example: {
        data: {
          id: 'hat-1-id',
          code: 'party_hat',
          owned: true,
          coinBalance: 75,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'The cosmetic item is already owned, or the user does not have enough coins.',
  })
  @ApiNotFoundResponse({
    description: 'The cosmetic item does not exist.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @Post(':id/purchase')
  async purchase(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.cosmeticsService.purchase(authUser, id);
  }
}
