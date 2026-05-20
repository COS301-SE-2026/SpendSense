import {IsOptional, IsDateString, IsString} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {PaginationDto} from '../../common/dto/pagination.dto';

export class UpcomingOccurrencesDto extends PaginationDto{
    @ApiPropertyOptional({example: '2026-05-19', description: 'Start date. Defaults to today.'})
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({example: '2026-06-30', description: 'End date. Defaults to 30 days from today.'})
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional({
        description: 'Comma-separated statuses. Defaults to PENDING,OVERDUE.',
        example: 'PENDING,OVERDUE',
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({example: 'obl_abc123', description: 'Filter by obligation ID.'})
    @IsOptional()
    @IsString()
    obligationId?: string;
}