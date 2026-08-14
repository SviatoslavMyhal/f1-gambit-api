import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OptimisticLockVersionMismatchError, type Repository } from 'typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { LobbyStatus } from '../lobby/lobby.types';
import { User } from '../users/entities/user.entity';
import { BettingService } from './betting.service';
import { BetStatus } from './betting.types';
import { Bet } from './entities/bet.entity';

function user(partial: Partial<User> & Pick<User, 'id' | 'balance'>): User {
  return {
    username: 'u',
    email: 'u@x.com',
    passwordHash: 'x',
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    racesCompleted: 0,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as User;
}

function bet(
  partial: Partial<Bet> &
    Pick<Bet, 'id' | 'bettorUserId' | 'predictedWinnerUserId' | 'stake'>,
): Bet {
  return {
    lobbyId: 'lobby-1',
    status: BetStatus.PENDING,
    payout: null,
    settledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as Bet;
}

describe('BettingService', () => {
  describe('settleBetsInTransaction', () => {
    let service: BettingService;
    let betRepo: jest.Mocked<Pick<Repository<Bet>, 'find' | 'save'>>;
    let userRepo: jest.Mocked<Pick<Repository<User>, 'findOneOrFail' | 'save'>>;
    let manager: { getRepository: jest.Mock };

    beforeEach(() => {
      betRepo = {
        find: jest.fn(),
        save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      };
      userRepo = {
        findOneOrFail: jest.fn(),
        save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
      manager = {
        getRepository: jest.fn((entity: unknown) =>
          entity === Bet ? betRepo : userRepo,
        ),
      };
      service = new BettingService(
        {} as Repository<Bet>,
        {} as Repository<User>,
        {} as Repository<Lobby>,
      );
    });

    it('pays double stake and credits balance for a bet that predicted the winner', async () => {
      const winningBet = bet({
        id: 'b1',
        bettorUserId: 'u1',
        predictedWinnerUserId: 'host',
        stake: 100,
      });
      betRepo.find.mockResolvedValue([winningBet]);
      userRepo.findOneOrFail.mockResolvedValue(user({ id: 'u1', balance: 500 }));

      await service.settleBetsInTransaction(manager as any, 'lobby-1', 'host');

      expect(betRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BetStatus.WON, payout: 200 }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', balance: 700 }),
      );
    });

    it('marks a losing bet LOST with zero payout and never touches balance', async () => {
      const losingBet = bet({
        id: 'b2',
        bettorUserId: 'u2',
        predictedWinnerUserId: 'opponent',
        stake: 100,
      });
      betRepo.find.mockResolvedValue([losingBet]);

      await service.settleBetsInTransaction(manager as any, 'lobby-1', 'host');

      expect(betRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BetStatus.LOST, payout: 0 }),
      );
      expect(userRepo.findOneOrFail).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('refunds the stake on a draw', async () => {
      const drawBet = bet({
        id: 'b3',
        bettorUserId: 'u3',
        predictedWinnerUserId: 'host',
        stake: 50,
      });
      betRepo.find.mockResolvedValue([drawBet]);
      userRepo.findOneOrFail.mockResolvedValue(user({ id: 'u3', balance: 200 }));

      await service.settleBetsInTransaction(manager as any, 'lobby-1', null);

      expect(betRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BetStatus.REFUNDED, payout: 50 }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u3', balance: 250 }),
      );
    });

    it('does nothing when there are no pending bets for the lobby', async () => {
      betRepo.find.mockResolvedValue([]);

      await service.settleBetsInTransaction(manager as any, 'lobby-1', 'host');

      expect(betRepo.save).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('placeBet', () => {
    let service: BettingService;
    let lobbies: jest.Mocked<Pick<Repository<Lobby>, 'findOne'>>;
    let usersManager: { transaction: jest.Mock };

    const hostId = 'host-1';
    const oppId = 'opp-1';
    const bettorId = 'bettor-1';

    function configuringLobby(overrides: Partial<Lobby> = {}): Lobby {
      return {
        id: 'lobby-1',
        hostUserId: hostId,
        opponentUserId: oppId,
        status: LobbyStatus.CONFIGURING,
        ...overrides,
      } as Lobby;
    }

    beforeEach(() => {
      lobbies = { findOne: jest.fn() };
      usersManager = { transaction: jest.fn() };
      service = new BettingService(
        {} as Repository<Bet>,
        { manager: usersManager } as unknown as Repository<User>,
        lobbies as unknown as Repository<Lobby>,
      );
    });

    it('debits balance and creates a pending bet', async () => {
      lobbies.findOne.mockResolvedValue(configuringLobby());
      const bettor = user({ id: bettorId, balance: 300 });
      const userRepo = {
        findOneOrFail: jest.fn().mockResolvedValue(bettor),
        save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
      const betRepo = {
        create: jest.fn((x) => x),
        save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      };
      usersManager.transaction.mockImplementation((cb) =>
        cb({
          getRepository: (entity: unknown) => (entity === User ? userRepo : betRepo),
        }),
      );

      const result = await service.placeBet(
        { id: bettorId } as User,
        'lobby-1',
        hostId,
        100,
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 200 }),
      );
      expect(betRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lobbyId: 'lobby-1',
          bettorUserId: bettorId,
          predictedWinnerUserId: hostId,
          stake: 100,
          status: BetStatus.PENDING,
        }),
      );
      expect(result.status).toBe(BetStatus.PENDING);
    });

    it('rejects a bet larger than the current balance', async () => {
      lobbies.findOne.mockResolvedValue(configuringLobby());
      const bettor = user({ id: bettorId, balance: 50 });
      const userRepo = {
        findOneOrFail: jest.fn().mockResolvedValue(bettor),
        save: jest.fn(),
      };
      usersManager.transaction.mockImplementation((cb) =>
        cb({ getRepository: () => userRepo }),
      );

      await expect(
        service.placeBet({ id: bettorId } as User, 'lobby-1', hostId, 100),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('rejects betting once the lobby has left CONFIGURING', async () => {
      lobbies.findOne.mockResolvedValue(
        configuringLobby({ status: LobbyStatus.SIMULATING }),
      );

      await expect(
        service.placeBet({ id: bettorId } as User, 'lobby-1', hostId, 100),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersManager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a predicted winner who is not a lobby participant', async () => {
      lobbies.findOne.mockResolvedValue(configuringLobby());

      await expect(
        service.placeBet({ id: bettorId } as User, 'lobby-1', 'someone-else', 100),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersManager.transaction).not.toHaveBeenCalled();
    });

    it('rejects when the lobby does not exist', async () => {
      lobbies.findOne.mockResolvedValue(null);

      await expect(
        service.placeBet({ id: bettorId } as User, 'lobby-1', hostId, 100),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('converts a concurrent balance write conflict into ConflictException', async () => {
      lobbies.findOne.mockResolvedValue(configuringLobby());
      const bettor = user({ id: bettorId, balance: 300 });
      const userRepo = {
        findOneOrFail: jest.fn().mockResolvedValue(bettor),
        save: jest
          .fn()
          .mockRejectedValue(new OptimisticLockVersionMismatchError('User', 1, 2)),
      };
      usersManager.transaction.mockImplementation((cb) =>
        cb({ getRepository: () => userRepo }),
      );

      await expect(
        service.placeBet({ id: bettorId } as User, 'lobby-1', hostId, 100),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
