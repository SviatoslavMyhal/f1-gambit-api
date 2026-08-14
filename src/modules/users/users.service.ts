import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { LobbyStatus } from '../lobby/lobby.types';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Lobby)
    private readonly lobbies: Repository<Lobby>,
  ) {}

  async findById(id: string): Promise<User> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`User ${id} not found`);
    return u;
  }

  async statsForUser(id: string) {
    const u = await this.findById(id);
    const winRate =
      u.racesCompleted === 0 ? 0 : Math.round((u.wins / u.racesCompleted) * 100);

    const recent = await this.lobbies.find({
      where: [
        { hostUserId: id, status: LobbyStatus.FINISHED },
        { opponentUserId: id, status: LobbyStatus.FINISHED },
      ],
      relations: ['track'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    const recentResults = recent.map((l) => ({
      lobbyId: l.id,
      trackSlug: l.track?.slug ?? null,
      winnerUserId: l.winnerUserId,
      wasHost: l.hostUserId === id,
      finishedAt: l.updatedAt,
    }));

    return {
      id: u.id,
      username: u.username,
      email: u.email,
      rating: u.rating,
      wins: u.wins,
      losses: u.losses,
      draws: u.draws,
      racesCompleted: u.racesCompleted,
      winRate,
      recentResults,
    };
  }

  async topByRating(limit: number): Promise<User[]> {
    const n = Math.min(50, Math.max(1, limit));
    return this.repo.find({
      order: { rating: 'DESC' },
      take: n,
      select: ['id', 'username', 'rating', 'wins', 'losses', 'racesCompleted'],
    });
  }
}
