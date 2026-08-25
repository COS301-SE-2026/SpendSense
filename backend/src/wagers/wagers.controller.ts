import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { CreateWagerDto } from './dto/create-wager.dto';
import { ListWagersDto } from './dto/list-wagers.dto';
import {
  ApiAcceptWagerDocs,
  ApiCancelWagerDocs,
  ApiCreateWagerDocs,
  ApiDeclineWagerDocs,
  ApiGetWagerDocs,
  ApiListWagersDocs,
} from './wagers.swagger';
import { WagersService } from './wagers.service';

@ApiTags('wagers')
@ApiBearerAuth()
@Controller('wagers')
@UseGuards(SupabaseJwtGuard)
export class WagersController {
  constructor(
    private readonly wagersService: WagersService,
    private readonly usersService: UsersService,
  ) {}

  @ApiCreateWagerDocs()
  @Post()
  async createWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() body: CreateWagerDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.createWager(user.id, body);
  }

  @ApiListWagersDocs()
  @Get()
  async listWagers(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: ListWagersDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.listWagers(user.id, query.status);
  }

  @ApiGetWagerDocs()
  @Get(':id')
  async getWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') wagerId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.getWager(user.id, wagerId);
  }

  @ApiAcceptWagerDocs()
  @Patch(':id/accept')
  async acceptWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') wagerId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.acceptWager(user.id, wagerId);
  }

  @ApiDeclineWagerDocs()
  @Patch(':id/decline')
  async declineWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') wagerId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.declineWager(user.id, wagerId);
  }

  @ApiCancelWagerDocs()
  @Delete(':id')
  async cancelWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') wagerId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.cancelWager(user.id, wagerId);
  }
}
