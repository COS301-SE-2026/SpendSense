import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DisplayNameAvailabilityDto {
  @Transform(({ value }: { value: unknown }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}
