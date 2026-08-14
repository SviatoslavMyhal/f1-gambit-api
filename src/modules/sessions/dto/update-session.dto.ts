import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { StrategyMetricsDto } from './strategy-metrics.dto';

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  playerName?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  seasonYear?: number;

  @ApiPropertyOptional({ description: 'Ergast constructorId for real-world comparison' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  compareConstructorRef?: string | null;

  @ApiPropertyOptional({
    description: 'Preset opponent key (see GET /sessions/meta/opponents)',
    example: 'ferrari',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  opponentConstructorRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StrategyMetricsDto)
  strategyMetrics?: StrategyMetricsDto | null;
}
