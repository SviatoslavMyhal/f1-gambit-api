import { Logger } from '@nestjs/common';
import { BettingEventsListener } from './betting-events.listener';
import { BetStatus } from './betting.types';
import type { LobbyBattleFinishedPayload } from '../lobby/events/lobby.events';

describe('BettingEventsListener', () => {
  it('logs one structured line per settled bet', () => {
    const listener = new BettingEventsListener();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const payload: LobbyBattleFinishedPayload = {
      lobbyId: 'lobby-1',
      hostUserId: 'h',
      opponentUserId: 'o',
      winnerUserId: 'h',
      gapSeconds: 1,
      settledBets: [
        { betId: 'b1', bettorUserId: 'u1', status: BetStatus.WON, stake: 100, payout: 200 },
        { betId: 'b2', bettorUserId: 'u2', status: BetStatus.LOST, stake: 50, payout: 0 },
      ],
    };

    listener.handleBattleFinished(payload);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls[0]![0]).toContain('betId=b1');
    expect(logSpy.mock.calls[0]![0]).toContain('status=won');
    expect(logSpy.mock.calls[1]![0]).toContain('betId=b2');
    expect(logSpy.mock.calls[1]![0]).toContain('status=lost');

    logSpy.mockRestore();
  });

  it('logs nothing when no bets were placed on the lobby', () => {
    const listener = new BettingEventsListener();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    listener.handleBattleFinished({
      lobbyId: 'lobby-1',
      hostUserId: 'h',
      opponentUserId: 'o',
      winnerUserId: null,
      gapSeconds: 0,
      settledBets: [],
    });

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
