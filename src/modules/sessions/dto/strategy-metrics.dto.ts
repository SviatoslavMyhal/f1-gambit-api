import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class StrategyMetricsDto {
  @ApiPropertyOptional({ description: '0 = slow pits, 1 = fast pits', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  pitAggression?: number;

  @ApiPropertyOptional({ description: '0 = tire preservation, 1 = raw pace', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  paceFocus?: number;

  @ApiPropertyOptional({ description: '0 = volatile, 1 = steady', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  consistency?: number;
}
