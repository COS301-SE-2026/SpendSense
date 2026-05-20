import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { LogPaymentDto } from './dto/log-payment.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
  ) {}

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a payment for the authenticated user' })
  @ApiBody({ type: LogPaymentDto })
  @ApiResponse({ status: 201, description: 'Payment logged successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Payment occurrence not found' })
  async logPayment(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: LogPaymentDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.paymentsService.logPayment(dto, user.id);
  }
}
