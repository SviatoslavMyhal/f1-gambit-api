import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CarSetupDto } from '../../setup/dto/car-setup.dto';
import { RaceStrategyDto } from '../../simulation/dto/race-strategy.dto';

export class SubmitConfigDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CarSetupDto)
  setup!: CarSetupDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => RaceStrategyDto)
  strategy!: RaceStrategyDto;
}
