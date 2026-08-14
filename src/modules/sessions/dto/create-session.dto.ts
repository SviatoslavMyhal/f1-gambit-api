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

export class CreateSessionDto {
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

  /** Ergast `constructorId`, e.g. `red_bull` — used for “vs real team” copy. */
  @ApiPropertyOptional({ example: 'red_bull' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  compareConstructorRef?: string;

  @ApiPropertyOptional({ example: 'ferrari', description: 'Sim opponent preset' })
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
