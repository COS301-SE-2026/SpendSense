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
  BadRequestException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
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
import { isUUID } from 'class-validator';

import { EligibleOccurrencesQueryDto } from './dto/eligible-occurrences-query.dto';
import { ContributionHistoryQueryDto } from './dto/contribution-history-query.dto';
import { PaymentQueriesService } from './payment-queries.service';

import { VoidContributionDto } from './dto/void-contribution.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly paymentContributionsService: PaymentContributionsService,
    private readonly paymentQueriesService: PaymentQueriesService,
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
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey && !isUUID(idempotencyKey, '4')) {
      throw new UnprocessableEntityException(
        'Idempotency-Key must be a valid UUID.',
      );
    }

    const user = await this.usersService.findOrCreateUser(authUser);

    return this.paymentsService.logPayment(dto, user.id, idempotencyKey);
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
  @ApiBody({ type: CreateContributionDto })
  @ApiResponse({
    status: 201,
    description: 'Payment contribution created successfully',
  })
  @ApiResponse({
    status: 200,
    description: 'Existing contribution replayed for the same idempotency key',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Payment occurrence not found' })
  @ApiResponse({ status: 409, description: 'Payment conflict' })
  async createContribution(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: CreateContributionDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new UnprocessableEntityException(
        'Idempotency-Key must be a valid UUID.',
      );
    }
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

  // GET /payments/occurrences/:occurrenceId/balance

  @Get('occurrences/:occurrenceId/balance')
  @ApiOperation({ summary: 'Get the current balance for a payment occurrence' })
  @ApiResponse({
    status: 200,
    description: 'Current occurrence balance returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid occurrence ID' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Payment occurrence not found' })
  async getOccurrenceBalance(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('occurrenceId', new ParseUUIDPipe()) occurrenceId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    return this.paymentContributionsService.getOccurrenceBalance(
      user.id,
      occurrenceId,
    );
  }

  // GET /payments/occurrences/eligible

  @Get('occurrences/eligible')
  @ApiOperation({
    summary: 'Get payment occurrences eligible to receive a payment',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligible payment occurrences returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  async getEligibleOccurrences(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: EligibleOccurrencesQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.paymentQueriesService.getEligibleOccurrences(user.id, query);
  }

  @Get('occurrences/:occurrenceId/contributions')
  @ApiOperation({
    summary: 'Get contribution history for a payment occurrence',
  })
  @ApiResponse({
    status: 200,
    description: 'Contribution history returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid occurrence ID or query parameters',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Payment occurrence not found' })
  async getContributionHistory(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('occurrenceId', new ParseUUIDPipe()) occurrenceId: string,
    @Query() query: ContributionHistoryQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.paymentQueriesService.getContributionHistory(
      user.id,
      occurrenceId,
      query,
    );
  }

  @Post('contributions/:contributionId/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void a payment contribution',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique UUID for this void request',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiResponse({ status: 200, description: 'Contribution voided successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid contribution ID or request body',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({ status: 404, description: 'Payment contribution not found' })
  @ApiResponse({ status: 409, description: 'Contribution cannot be voided' })
  async voidContribution(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('contributionId', new ParseUUIDPipe())
    contributionId: string,
    @Body() dto: VoidContributionDto,
    @Headers('idempotency-key')
    idempotencyKey: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    if (!isUUID(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID.');
    }

    return this.paymentContributionsService.voidContribution(
      user.id,
      contributionId,
      dto.reason,
    );
  }
}
