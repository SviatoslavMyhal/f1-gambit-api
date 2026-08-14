import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';
import { CarSetupDto } from '../../setup/dto/car-setup.dto';
import { WeatherCondition } from '../../lobby/lobby.types';

export class AiAdviceDto {
  @IsString()
  trackSlug!: string;

  @ApiProperty({ enum: WeatherCondition })
  @IsEnum(WeatherCondition)
  weather!: WeatherCondition;

  @ValidateNested()
  @Type(() => CarSetupDto)
  currentSetup!: CarSetupDto;
}
