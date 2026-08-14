import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { WeatherCondition } from '../../lobby/lobby.types';
import type { AIPersonality } from '../ai.types';

export class AiConfigDto {
  @IsString()
  trackSlug!: string;

  @IsEnum(WeatherCondition)
  weather!: WeatherCondition;

  @ApiPropertyOptional({ enum: ['aggressive', 'balanced', 'conservative', 'random'] })
  @IsOptional()
  @IsIn(['aggressive', 'balanced', 'conservative', 'random'])
  personality?: AIPersonality;
}
