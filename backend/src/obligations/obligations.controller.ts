import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ObligationsService } from './obligations.service';
import { CreateObligationDto } from './dto/create-obligation.dto';
import { ListObligationsDto } from './dto/list-obligations.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateObligationDto } from './dto/update-obligation.dto';

@ApiTags('obligations')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('obligations')
export class ObligationsController {
  constructor(
    private readonly obligationsService: ObligationsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a financial obligation with schedule, occurrences, and reminders',
  })
  @ApiBody({ type: CreateObligationDto })
  @ApiResponse({ status: 201, description: 'Obligation created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async create(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: CreateObligationDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    return this.obligationsService.create(user.id, dto, user.notificationPreference.defaultReminderDaysBefore);
  }

  @Get()
  @ApiOperation({
    summary: "List the authenticated user's financial obligations",
  })
  @ApiResponse({ status: 200, description: 'Obligations list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  async list(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: ListObligationsDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.obligationsService.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one obligation with schedule, upcoming occurrences, and recent payments',
  })
  @ApiParam({ name: 'id', description: 'Obligation ID' })
  @ApiResponse({ status: 200, description: 'Obligation detail returned' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Financial obligation not found' })
  async findOne(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.obligationsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update an obligation and optionally regenerate future occurrences',
  })
  @ApiParam({ name: 'id', description: 'Obligation ID' })
  @ApiBody({ type: UpdateObligationDto })
  @ApiResponse({ status: 200, description: 'Obligation updated' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Financial obligation not found' })
  async update(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateObligationDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.obligationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Archive (soft-delete) an obligation and cancel future occurrences',
  })
  @ApiParam({ name: 'id', description: 'Obligation ID' })
  @ApiResponse({ status: 200, description: 'Obligation archived' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Financial obligation not found' })
  async archive(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') id: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.obligationsService.archive(user.id, id);
  }
}
