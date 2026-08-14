import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { TireCompound } from '../../setup/dto/tire-compound';

export class RaceStrategyDto {
  @ApiProperty({ enum: TireCompound })
  @IsEnum(TireCompound)
  startingCompound!: TireCompound;

  @ApiProperty({ type: [Number], description: '[earliestLap, latestLap]' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsInt({ each: true })
  pitWindow!: [number, number];

  @ApiProperty({ minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  fuelLoad!: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  aggressionLevel!: number;

  @ApiProperty({ enum: ['pit', 'stay'] })
  @IsIn(['pit', 'stay'])
  safetyCarReaction!: 'pit' | 'stay';
}
