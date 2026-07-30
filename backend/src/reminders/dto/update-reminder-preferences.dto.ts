import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReminderPreferencesDto {
  @ApiPropertyOptional({
    example: 3,
    enum: [1, 3, 5, 7],
    description: 'Days before an occurrence is due to send reminder',
  })
  @IsOptional()
  @IsIn([1, 3, 5, 7])
  defaultReminderDaysBefore?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user will receive in app notifications',
  })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}
