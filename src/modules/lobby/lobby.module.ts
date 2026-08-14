import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { BettingModule } from '../betting/betting.module';
import { SimulationModule } from '../simulation/simulation.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { TrackModule } from '../track/track.module';
import { UsersModule } from '../users/users.module';
import { Lobby } from './entities/lobby.entity';
import { LobbyGateway } from './lobby.gateway';
import { LobbyController } from './lobby.controller';
import { LobbyResponseMapper } from './lobby-response.mapper';
import { LobbyEventsListener } from './lobby-events.listener';
import { LobbyService } from './lobby.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lobby]),
    AuthModule,
    TrackModule,
    SimulationModule,
    TelemetryModule,
    UsersModule,
    AiModule,
    BettingModule,
  ],
  controllers: [LobbyController],
  providers: [LobbyService, LobbyResponseMapper, LobbyGateway, LobbyEventsListener],
  exports: [LobbyService],
})
export class LobbyModule {}
