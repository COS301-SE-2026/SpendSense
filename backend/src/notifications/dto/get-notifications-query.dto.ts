import {Transform,Type} from 'class-transformer';
import {IsBoolean,IsEnum,IsInt,IsOptional,Max,Min,} from 'class-validator';
import { NotificationType } from '@prisma/client/edge';

export class GetNotificationsQueryDto {
  @IsOptional()
  @Transform(({value})=>{
    if(value==='true'){
        return true;
    }
    if(value==='false'){
        return false;
    }
    return value;
  })
  @IsBoolean()
  unreadOnly?:boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?:NotificationType;

  @IsOptional()
  @Type(()=>Number)
  @IsInt()
  @Min(1)
  page=1;

  @IsOptional()
  @Type(()=>Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage=20;
}