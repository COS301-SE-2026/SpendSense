import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class SetupSimulationDto {
  @ApiPropertyOptional({
    example: 'current_70_savings_30',
    description: 'One of the allocation IDs saved in the fictional briefing.',
  })
  @IsOptional()
  @IsString()
  allocationId?: string;

  @ApiPropertyOptional({
    example: '4250.00',
    description:
      'A custom fictional Current amount using two decimal places and the saved R50 increment.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d{2}$/)
  currentAmount?: string;
}
