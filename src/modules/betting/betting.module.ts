import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { User } from '../users/entities/user.entity';
import { BettingController } from './betting.controller';
import { BettingEventsListener } from './betting-events.listener';
import { BettingService } from './betting.service';
import { Bet } from './entities/bet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bet, User, Lobby])],
  controllers: [BettingController],
  providers: [BettingService, BettingEventsListener],
  exports: [BettingService],
})
export class BettingModule {}
