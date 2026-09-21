import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { LogPaymentDto } from './dto/log-payment.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

import type { Response } from 'express';
import { PaymentContributionSource, Prisma } from '@prisma/client';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { PaymentContributionsService } from './payment-contributions.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly paymentContributionsService: PaymentContributionsService,
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

  // api/v1/payments/contributions
  @Post('contributions')
  @ApiOperation({
    summary: 'Create a manual payment contribution',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique UUID for safely retrying this payment request',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiBody({
    type: CreateContributionDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Payment contribution created successfully',
  })
  @ApiResponse({
    status: 200,
    description: 'Existing contribution replayed for the same idempotency key',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorised',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment occurrence not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Payment conflict',
  })
  async createContribution(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: CreateContributionDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const paidDate = new Date(dto.paidDate);

    if (paidDate.getTime() > Date.now()) {
      throw new UnprocessableEntityException(
        'Payment date cannot be in the future.',
      );
    }

    const result = await this.paymentContributionsService.createContribution({
      userId: user.id,
      occurrenceId: dto.occurrenceId,
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency,
      paidDate,
      source: PaymentContributionSource.MANUAL,
      idempotencyKey,
      notes: dto.notes,
    });

    response.status(result.replayed ? HttpStatus.OK : HttpStatus.CREATED);

    return result;
  }
}
