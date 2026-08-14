import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { User } from './entities/user.entity';
import { LEADERBOARD_RANK_QUEUE } from './leaderboard-rank.constants';
import { LeaderboardRankListener } from './leaderboard-rank.listener';
import { LeaderboardRankProcessor } from './leaderboard-rank.processor';
import { RatingService } from './rating.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Lobby]),
    BullModule.registerQueue({ name: LEADERBOARD_RANK_QUEUE }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    RatingService,
    LeaderboardRankListener,
    LeaderboardRankProcessor,
  ],
  exports: [UsersService, RatingService, TypeOrmModule],
})
export class UsersModule {}
