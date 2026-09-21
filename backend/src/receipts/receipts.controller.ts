import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  Param,
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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptScanDto } from './dto/create-receipt-scan.dto';

@ApiTags('receipts')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly usersService: UsersService,
  ) {}

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
}
