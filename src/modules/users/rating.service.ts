import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';

const K_FACTOR = 32;

export type RatingChange = {
  userId: string;
  delta: number;
  newRating: number;
};

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async processResult(
    hostId: string,
    opponentId: string,
    winnerUserId: string | null,
  ): Promise<RatingChange[]> {
    return this.processResultWithManager(
      this.users.manager,
      hostId,
      opponentId,
      winnerUserId,
    );
  }

  /** Uses `manager` so rating updates participate in the caller's transaction. */
  async processResultInTransaction(
    manager: EntityManager,
    hostId: string,
    opponentId: string,
    winnerUserId: string | null,
  ): Promise<RatingChange[]> {
    return this.processResultWithManager(
      manager,
      hostId,
      opponentId,
      winnerUserId,
    );
  }

  private async processResultWithManager(
    manager: EntityManager,
    hostId: string,
    opponentId: string,
    winnerUserId: string | null,
  ): Promise<RatingChange[]> {
    const usersRepo = manager.getRepository(User);
    const [host, opponent] = await Promise.all([
      usersRepo.findOneOrFail({ where: { id: hostId } }),
      usersRepo.findOneOrFail({ where: { id: opponentId } }),
    ]);

    const scoreHost =
      winnerUserId === hostId ? 1 : winnerUserId === opponentId ? 0 : 0.5;

    const { deltaHost, deltaOpp } = this.calculateEloPair(
      host.rating,
      opponent.rating,
      scoreHost,
    );

    const hostOutcome =
      winnerUserId === hostId
        ? 'win'
        : winnerUserId === opponentId
          ? 'loss'
          : 'draw';
    const oppOutcome =
      winnerUserId === opponentId
        ? 'win'
        : winnerUserId === hostId
          ? 'loss'
          : 'draw';

    const hostNew = Math.max(100, host.rating + deltaHost);
    const oppNew = Math.max(100, opponent.rating + deltaOpp);

    await Promise.all([
      usersRepo.update(hostId, {
        rating: hostNew,
        wins: host.wins + (hostOutcome === 'win' ? 1 : 0),
        losses: host.losses + (hostOutcome === 'loss' ? 1 : 0),
        draws: host.draws + (hostOutcome === 'draw' ? 1 : 0),
        racesCompleted: host.racesCompleted + 1,
      }),
      usersRepo.update(opponentId, {
        rating: oppNew,
        wins: opponent.wins + (oppOutcome === 'win' ? 1 : 0),
        losses: opponent.losses + (oppOutcome === 'loss' ? 1 : 0),
        draws: opponent.draws + (oppOutcome === 'draw' ? 1 : 0),
        racesCompleted: opponent.racesCompleted + 1,
      }),
    ]);

    return [
      { userId: hostId, delta: hostNew - host.rating, newRating: hostNew },
      { userId: opponentId, delta: oppNew - opponent.rating, newRating: oppNew },
    ];
  }

  private calculateEloPair(
    ratingA: number,
    ratingB: number,
    scoreA: number,
  ): { deltaHost: number; deltaOpp: number } {
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 - expectedA;
    const kA = ratingA > 2000 ? 16 : K_FACTOR;
    const kB = ratingB > 2000 ? 16 : K_FACTOR;
    const deltaHost = Math.round(kA * (scoreA - expectedA));
    const deltaOpp = Math.round(kB * ((1 - scoreA) - expectedB));
    return { deltaHost, deltaOpp };
  }
}
