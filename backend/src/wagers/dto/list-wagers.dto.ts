import {WagerStatus} from '@prisma/client';
import {IsEnum,IsOptional} from 'class-validator';

export class ListWagersDto{
    @IsOptional()
    @IsEnum(WagerStatus)
    status?:WagerStatus;
}