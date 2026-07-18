import { Max, Min, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReminderPreferencesDto{
    @ApiPropertyOptional({example: 3, description: 'Days before an occurrence is due to send reminder'})
    @Min(1)
    @Max(30)
    @IsOptional()
    @IsInt()
    defaultReminderDaysBefore?: number;
}