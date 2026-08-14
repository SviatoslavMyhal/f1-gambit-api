import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { LobbyStatus } from '../lobby/lobby.types';
import { User } from '../users/entities/user.entity';
import { BetStatus, type BetSettlementSummary } from './betting.types';
import { Bet } from './entities/bet.entity';

@Injectable()
export class BettingService {
  constructor(
    @InjectRepository(Bet)
    private readonly bets: Repository<Bet>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Lobby)
    private readonly lobbies: Repository<Lobby>,
  ) {}

  async placeBet(
    bettor: User,
    lobbyId: string,
    predictedWinnerUserId: string,
    stake: number,
  ): Promise<Bet> {
    if (stake <= 0) {
      throw new BadRequestException('Stake must be a positive integer');
    }

    const lobby = await this.lobbies.findOne({ where: { id: lobbyId } });
    if (!lobby) {
      throw new NotFoundException(`Lobby ${lobbyId} not found`);
    }
    if (lobby.status !== LobbyStatus.CONFIGURING) {
      throw new BadRequestException(
        'Betting is only open while the lobby is configuring',
      );
    }
    if (
      predictedWinnerUserId !== lobby.hostUserId &&
      predictedWinnerUserId !== lobby.opponentUserId
    ) {
      throw new BadRequestException(
        'Predicted winner must be a participant in this lobby',
      );
    }

    return this.users.manager.transaction(async (manager) => {
      const usersRepo = manager.getRepository(User);
      const user = await usersRepo.findOneOrFail({ where: { id: bettor.id } });
      if (user.balance < stake) {
        throw new BadRequestException('Insufficient balance');
      }
      user.balance -= stake;

      try {
        await usersRepo.save(user);
      } catch (e) {
        if (e instanceof OptimisticLockVersionMismatchError) {
          throw new ConflictException(
            'Balance changed concurrently, please retry',
          );
        }
        throw e;
      }

      const betsRepo = manager.getRepository(Bet);
      return betsRepo.save(
        betsRepo.create({
          lobbyId,
          bettorUserId: bettor.id,
          predictedWinnerUserId,
          stake,
          status: BetStatus.PENDING,
        }),
      );
    });
  }

  /**
   * Uses `manager` so bet settlement participates in the caller's settlement transaction.
   * Returns a summary (not emitted here) so the caller can raise it as part of its own
   * post-commit domain event — emitting from inside a transaction that might still roll
   * back would announce a settlement that never happened.
   */
  async settleBetsInTransaction(
    manager: EntityManager,
    lobbyId: string,
    winnerUserId: string | null,
  ): Promise<BetSettlementSummary[]> {
    const betsRepo = manager.getRepository(Bet);
    const usersRepo = manager.getRepository(User);

    const pending = await betsRepo.find({
      where: { lobbyId, status: BetStatus.PENDING },
    });

    const summaries: BetSettlementSummary[] = [];

    for (const bet of pending) {
      const refunded = winnerUserId === null;
      const won = !refunded && bet.predictedWinnerUserId === winnerUserId;

      bet.status = refunded ? BetStatus.REFUNDED : won ? BetStatus.WON : BetStatus.LOST;
      bet.payout = refunded ? bet.stake : won ? bet.stake * 2 : 0;
      bet.settledAt = new Date();
      await betsRepo.save(bet);

      if (bet.payout > 0) {
        const bettor = await usersRepo.findOneOrFail({
          where: { id: bet.bettorUserId },
        });
        bettor.balance += bet.payout;
        await usersRepo.save(bettor);
      }

      summaries.push({
        betId: bet.id,
        bettorUserId: bet.bettorUserId,
        status: bet.status,
        stake: bet.stake,
        payout: bet.payout,
      });
    }

    return summaries;
  }
}
