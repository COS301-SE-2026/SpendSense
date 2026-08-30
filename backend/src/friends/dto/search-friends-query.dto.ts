import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class SearchFriendsQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  @MinLength(2)
  query!: string;
}
