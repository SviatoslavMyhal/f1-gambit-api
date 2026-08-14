import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CarSetupDto } from '../../setup/dto/car-setup.dto';

export class SimulateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CarSetupDto)
  setup?: CarSetupDto;

  @ApiProperty({ example: 'spa' })
  @IsString()
  @MaxLength(64)
  trackSlug!: string;

  @ApiProperty({ description: 'Race strategy (stints, pit windows, …)' })
  @IsObject()
  strategy!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seed?: string;

  @ApiPropertyOptional({
    description:
      'Grid size for competitive ranking (2–22). Required implicitly: defaults to 20. Invalid values are rejected.',
    minimum: 2,
    maximum: 22,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(22)
  gridSize?: number;

  @ApiPropertyOptional({
    description:
      'Optional reference profiles to compare against (per track). Use GET /tracks/:slug/references. Unknown ids are ignored.',
    type: [String],
    example: ['quali_push', 'race_manage'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  compareToReferenceIds?: string[];

  @ApiPropertyOptional({
    description:
      'If true, compare against every reference profile for this track (same ids as GET /tracks/:slug/references). Merged with compareToReferenceIds.',
  })
  @IsOptional()
  @IsBoolean()
  compareAllReferences?: boolean;
}
