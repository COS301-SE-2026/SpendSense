import {WagerTaskType} from '@prisma/client';
import {IsEnum,IsInt,IsUUID,Min} from 'class-validator';

export class CreateWagerDto{
    @IsUUID()
    opponentId!:string;

    @IsEnum(WagerTaskType)
    taskType!:WagerTaskType;

    @IsInt()
    @Min(0)
    stakeAmount!:number;

    @IsInt()
    @Min(1)
    durationDays!:number;
}