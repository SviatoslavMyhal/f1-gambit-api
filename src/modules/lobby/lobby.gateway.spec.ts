import { LobbyGateway } from './lobby.gateway';
import type { LobbyBattleFinishedPayload } from './events/lobby.events';

describe('LobbyGateway', () => {
  let gateway: LobbyGateway;

  beforeEach(() => {
    gateway = new LobbyGateway();
  });

  describe('handleJoinLobby', () => {
    it('joins the client socket to a room scoped to the lobby id', () => {
      const client = { id: 'sid-1', join: jest.fn() } as any;

      const ack = gateway.handleJoinLobby(client, { lobbyId: 'lobby-1' });

      expect(client.join).toHaveBeenCalledWith('lobby:lobby-1');
      expect(ack).toEqual({
        event: 'lobby:joined',
        data: { ok: true, room: 'lobby:lobby-1' },
      });
    });
  });

  describe('emitBattleFinished', () => {
    it('broadcasts only to the room for that lobby', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as any;

      const payload: LobbyBattleFinishedPayload = {
        lobbyId: 'lobby-1',
        hostUserId: 'h',
        opponentUserId: 'o',
        winnerUserId: 'h',
        gapSeconds: 1.5,
        settledBets: [],
      };

      gateway.emitBattleFinished(payload);

      expect(to).toHaveBeenCalledWith('lobby:lobby-1');
      expect(emit).toHaveBeenCalledWith('lobby:battleFinished', payload);
    });
  });
});
