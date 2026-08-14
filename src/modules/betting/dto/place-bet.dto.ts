import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class PlaceBetDto {
  @ApiProperty({ description: 'userId of the lobby participant you predict will win' })
  @IsUUID()
  predictedWinnerUserId: string;

  @ApiProperty({ description: 'Amount to stake, deducted from balance immediately' })
  @IsInt()
  @Min(1)
  stake: number;
}
