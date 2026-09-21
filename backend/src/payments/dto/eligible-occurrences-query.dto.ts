import {
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class EligibleOccurrencesQueryDto {
    @IsOptional() @IsString() cursor?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}