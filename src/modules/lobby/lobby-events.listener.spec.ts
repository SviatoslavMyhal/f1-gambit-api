import { LobbyEventsListener } from './lobby-events.listener';
import { LobbyGateway } from './lobby.gateway';
import type {
  LobbyBattleFinishedPayload,
  LobbyOpponentJoinedPayload,
} from './events/lobby.events';

describe('LobbyEventsListener', () => {
  let listener: LobbyEventsListener;
  let gateway: jest.Mocked<Pick<LobbyGateway, 'emitBattleFinished'>>;

  beforeEach(() => {
    gateway = { emitBattleFinished: jest.fn() };
    listener = new LobbyEventsListener(gateway as unknown as LobbyGateway);
  });

  it('handleOpponentJoined does not touch the gateway', () => {
    const payload: LobbyOpponentJoinedPayload = {
      lobbyId: 'lobby-1',
      hostUserId: 'h',
      opponentUserId: 'o',
    };

    listener.handleOpponentJoined(payload);

    expect(gateway.emitBattleFinished).not.toHaveBeenCalled();
  });

  it('handleBattleFinished forwards the payload to the gateway for WS broadcast', () => {
    const payload: LobbyBattleFinishedPayload = {
      lobbyId: 'lobby-1',
      hostUserId: 'h',
      opponentUserId: 'o',
      winnerUserId: 'h',
      gapSeconds: 2.3,
      settledBets: [
        { betId: 'b1', bettorUserId: 'u1', status: 'won' as any, stake: 100, payout: 200 },
      ],
    };

    listener.handleBattleFinished(payload);

    expect(gateway.emitBattleFinished).toHaveBeenCalledWith(payload);
  });
});
