import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from '../../track/entities/track.entity';
import { StrategyService } from './strategy.service';

@Module({
  imports: [TypeOrmModule.forFeature([Track])],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
