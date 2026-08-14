import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from './database/database.config';
import { createBullRootOptions } from './queue/queue.config';
import { CalibrationModule } from './modules/calibration/calibration.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { BettingModule } from './modules/betting/betting.module';
import { F1DataModule } from './modules/f1-data/f1-data.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { LobbyModule } from './modules/lobby/lobby.module';
import { OpenF1Module } from './modules/openf1/openf1.module';
import { ResultsModule } from './modules/results/results.module';
import { SetupModule } from './modules/setup/setup.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { TrackModule } from './modules/track/track.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppBootstrapService } from './common/lifecycle/app-bootstrap.service';
import { CorrelationService } from './common/request-scoped/correlation.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createBullRootOptions,
    }),
    EventEmitterModule.forRoot(),
    SessionsModule,
    AuthModule,
    UsersModule,
    LobbyModule,
    BettingModule,
    AiModule,
    SetupModule,
    SimulationModule,
    LeaderboardModule,
    F1DataModule,
    OpenF1Module,
    CalibrationModule,
    TrackModule,
    TelemetryModule,
    ResultsModule,
  ],
  controllers: [AppController],
  providers: [AppBootstrapService, CorrelationService],
})
export class AppModule {}
