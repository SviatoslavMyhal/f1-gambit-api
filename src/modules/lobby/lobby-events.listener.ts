import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LOBBY_BATTLE_FINISHED,
  LOBBY_OPPONENT_JOINED,
  type LobbyBattleFinishedPayload,
  type LobbyOpponentJoinedPayload,
} from './events/lobby.events';

/**
 * Thin domain listeners: structured logs today; extend with metrics / WS rooms later.
 */
@Injectable()
export class LobbyEventsListener {
  private readonly logger = new Logger(LobbyEventsListener.name);

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
  }
}
