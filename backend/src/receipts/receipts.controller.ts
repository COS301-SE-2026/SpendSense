import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { ReceiptsService } from './receipts.service';
import { UsersService } from '../users/users.service';
@ApiTags('receipts')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('receipts')
export class ReceiptsController {
    constructor(
        private readonly receiptsService: ReceiptsService,
        private readonly usersService: UsersService,
    ) { }
}