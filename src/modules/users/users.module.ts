import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { User } from './entities/user.entity';
import { RatingService } from './rating.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Lobby])],
  controllers: [UsersController],
  providers: [UsersService, RatingService],
  exports: [UsersService, RatingService, TypeOrmModule],
})
export class UsersModule {}
