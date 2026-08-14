import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty()
  @IsUUID()
  sessionId!: string;

  @ApiProperty()
  @IsString()
  playerName!: string;

  /** Mini-season constructor points (same unit as `finalScore` after simulate). */
  @ApiProperty({ description: 'Constructor points from the 5-race simulation' })
  @IsNumber()
  @Min(0)
  @Max(1e9)
  score!: number;

  @ApiPropertyOptional({ description: 'Optional context for compare UI (opponent, sliders, …)' })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
