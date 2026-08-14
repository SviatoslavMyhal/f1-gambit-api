import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class CreateLobbyDto {
  @ApiPropertyOptional({ enum: [1, 3, 5, 10] })
  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 5, 10])
  configTimeLimitMinutes?: number;
}
