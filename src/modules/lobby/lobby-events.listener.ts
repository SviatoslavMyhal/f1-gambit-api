import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LobbyGateway } from './lobby.gateway';
import {
  LOBBY_BATTLE_FINISHED,
  LOBBY_OPPONENT_JOINED,
  type LobbyBattleFinishedPayload,
  type LobbyOpponentJoinedPayload,
} from './events/lobby.events';

/**
 * Notification side-effect: broadcasts to the lobby's WS room. Structured logs stay here too;
 * extend with metrics later.
 */
@Injectable()
export class LobbyEventsListener {
  private readonly logger = new Logger(LobbyEventsListener.name);

  constructor(private readonly gateway: LobbyGateway) {}

  @OnEvent(LOBBY_OPPONENT_JOINED)
  handleOpponentJoined(payload: LobbyOpponentJoinedPayload): void {
    this.logger.log(
      `lobby.opponent.joined lobbyId=${payload.lobbyId} host=${payload.hostUserId} opponent=${payload.opponentUserId}`,
    );
  }

  @OnEvent(LOBBY_BATTLE_FINISHED)
  handleBattleFinished(payload: LobbyBattleFinishedPayload): void {
    const winner =
      payload.winnerUserId === null ? 'draw' : payload.winnerUserId;
    this.logger.log(
      `lobby.battle.finished lobbyId=${payload.lobbyId} winner=${winner} gapSeconds=${payload.gapSeconds}`,
    );
    this.gateway.emitBattleFinished(payload);
  }
}
