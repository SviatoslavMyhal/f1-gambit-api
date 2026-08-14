import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { TireCompound } from './tire-compound';

export class CarSetupDto {
  @ApiProperty({ minimum: 1, maximum: 11 })
  @IsInt()
  @Min(1)
  @Max(11)
  frontWing!: number;

  @ApiProperty({ minimum: 1, maximum: 11 })
  @IsInt()
  @Min(1)
  @Max(11)
  rearWing!: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  suspensionStiffness!: number;

  @ApiProperty({ description: '% to front axle', minimum: 52, maximum: 66 })
  @IsInt()
  @Min(52)
  @Max(66)
  brakeBias!: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  rideHeight!: number;

  @ApiProperty({ description: 'On-throttle diff lock %', minimum: 50, maximum: 100 })
  @IsInt()
  @Min(50)
  @Max(100)
  differentialOnThrottle!: number;

  @ApiProperty({ enum: TireCompound })
  @IsEnum(TireCompound)
  startingCompound!: TireCompound;

  @ApiProperty({ minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  fuelLoad!: number;
}
