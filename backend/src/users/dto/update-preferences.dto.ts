import {
  IsBoolean,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Theme, Currency } from '@prisma/client';

const SUPPORTED_LANGS = ['en'];

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: Theme, example: Theme.LIGHT })
  @IsOptional()
  @IsIn(Object.values(Theme))
  theme?: Theme;

  @ApiPropertyOptional({ example: 'en', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  @IsIn(SUPPORTED_LANGS)
  language?: string;

  @ApiPropertyOptional({ enum: Currency, example: Currency.ZAR })
  @IsOptional()
  @IsIn(Object.values(Currency))
  currency?: Currency;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reducedMotion?: boolean;
}
