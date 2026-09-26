import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  Param,
  Headers,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptScanDto } from './dto/create-receipt-scan.dto';
import type { Response } from 'express';
import { ConfirmReceiptScanDto } from './dto/confirm-receipt-scan.dto';
import { CreateReceiptObligationDto } from './dto/create-receipt-obligation.dto';

@ApiTags('receipts')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly usersService: UsersService,
  ) { }

  // POST /receipts/scans
  @Post('scans')
  @ApiOperation({ summary: 'Upload a receipt for OCR review' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        preselectedOccurrenceId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
      },
      required: ['image'],
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 8 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async createScan(
    @CurrentAuthUser() authUser: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateReceiptScanDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.receiptsService.validateReceiptUpload(
      user.id,
      file,
      dto.preselectedOccurrenceId,
    );
  }

  // GET /receipts/scans/:scanId

  @Get('scans/:scanId')
  @ApiOperation({
    summary: 'Restore a receipt scan review draft',
  })
  @ApiParam({ name: 'scanId', description: 'Receipt scan ID' })
  @ApiOkResponse({
    description: 'Receipt scan review draft returned successfully',
  })
  @ApiNotFoundResponse({
    description:
      'Receipt scan does not exist, does not belong to the user, is expired, or has already been consumed',
  })
  async getScan(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('scanId') scanId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.receiptsService.getReceiptScan(user.id, scanId);
  }

  // POST /receipts/scans/:scanId/confirm

  @Post('scans/:scanId/confirm')
  @ApiOperation({
    summary: 'Confirm a receipt scan and record its payment contribution',
  })
  @ApiParam({
    name: 'scanId',
    description: 'Receipt scan ID',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique UUID used to safely retry this confirmation',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiBody({ type: ConfirmReceiptScanDto })
  @ApiResponse({
    status: 201,
    description: 'Receipt scan confirmed and contribution created',
  })
  @ApiResponse({ status: 200, description: 'Existing confirmation replayed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  @ApiResponse({
    status: 404,
    description: 'Receipt scan or occurrence not found',
  })
  @ApiResponse({ status: 409, description: 'Receipt scan or payment conflict' })
  async confirmScan(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('scanId') scanId: string,
    @Body() dto: ConfirmReceiptScanDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    const result = await this.receiptsService.confirmReceiptScan(
      user.id,
      scanId,
      dto,
      idempotencyKey,
    );

    response.status(result.replayed ? HttpStatus.OK : HttpStatus.CREATED);

    return result;
  }

  // POST /receipts/scans/:scanId/create-obligation
  @Post('scans/:scanId/create-obligation')
  @ApiOperation({
    summary: 'Create an obligation from a reviewed receipt and record its payment',
  })
  @ApiParam({ name: 'scanId', description: 'Receipt scan UUID' })

  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'UUID v4 used to safely retry the receipt confirmation',
    required: true,
  })
  
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'The obligation was created and the receipt payment was recorded successfully.',
  })
  
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid receipt, obligation details, or payment details.',
  })
  
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Receipt scan or category not found.',
  })

  async createObligationFromScan(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('scanId') scanId: string,
    @Body() dto: CreateReceiptObligationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,

  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const result = await this.receiptsService.createObligationFromReceipt(user.id, scanId, dto, idempotencyKey,);
    response.status(result.replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return result;
  }
}
