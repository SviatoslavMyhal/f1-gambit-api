import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationModule } from '../calibration/calibration.module';
import { F1DataModule } from '../f1-data/f1-data.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { TrackModule } from '../track/track.module';
import { DynamicsModule } from './dynamics/dynamics.module';
import { EngineConfigModule } from './engine-config.module';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationRun } from './simulation-run.entity';

@Module({
  imports: [
    EngineConfigModule.forRoot(),
    TypeOrmModule.forFeature([SimulationRun]),
    SessionsModule,
    F1DataModule,
    LeaderboardModule,
    TrackModule,
    TelemetryModule,
    DynamicsModule,
    CalibrationModule,
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
