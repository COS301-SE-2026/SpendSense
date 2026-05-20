import {IsOptional, IsEnum, IsString, IsBoolean} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {ObligationStatus, ObligationType} from '@prisma/client';
import {PaginationDto} from '../../common/dto/pagination.dto';

export class ListObligationsDto extends PaginationDto {
    @ApiPropertyOptional({enum: ObligationStatus, example: 'ACTIVE'})
    @IsOptional()
    @IsEnum(ObligationStatus)
    status?: ObligationStatus;

    @ApiPropertyOptional({enum: ObligationType, example: 'SUBSCRIPTION'})
    @IsOptional()
    @IsEnum(ObligationType)
    type?: ObligationType;

    @ApiPropertyOptional({example: 'cat_abc123' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({example: true, description: 'Sort by soonest upcoming occurrence first'})
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    dueSoon?: boolean;
}