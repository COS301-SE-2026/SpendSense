import { Max, Min, IsOptional, IsInt } from 'class-validator';
import { ApiProprtyOptional } from '@nestjs/swagger';

export class UpdateReminderPreferencesDto{
    @ApiProprtyOptional({example: 3, description: 'Days before an occurrence is due to send reminder'})
    @Min(1)
    @Max(30)
    @IsOptional()
    @IsInt()
    defaultReminderDaysBefore?: number;
}