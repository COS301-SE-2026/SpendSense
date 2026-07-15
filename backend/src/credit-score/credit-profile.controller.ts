import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { CreditProfileService } from './credit-profile.service';
import { UpdateMonthlyBudgetDto } from './dto/update-monthly-budget.dto';

@Controller('api/v1/credit-profile')
export class CreditProfileController {
    constructor(private readonly creditProfileService: CreditProfileService) { }

    @Get()
    async getCreditProfile(@Req() req: { user: { id: string } }) {
        return this.creditProfileService.getCreditProfile(req.user.id);
    }

    @Patch('monthly-budget')
    async updateMonthlyBudget(@Req() req: { user: { id: string } }, @Body() dto: UpdateMonthlyBudgetDto) {
        return this.creditProfileService.updateMonthlyBudgetAndRecalculate(req.user.id, dto.monthlyBudget);
    }
}