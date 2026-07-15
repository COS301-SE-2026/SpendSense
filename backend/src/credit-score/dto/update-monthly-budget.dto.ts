import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateMonthlyBudgetDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    monthlyBudget: number;
}