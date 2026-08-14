import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackModule } from '../track/track.module';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { TrackLapBaseline } from './entities/track-lap-baseline.entity';
import { OpenF1HttpClient } from './openf1-http.client';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TrackLapBaseline]),
    TrackModule,
  ],
  controllers: [CalibrationController],
  providers: [CalibrationService, OpenF1HttpClient],
  exports: [CalibrationService],
})
export class CalibrationModule {}
