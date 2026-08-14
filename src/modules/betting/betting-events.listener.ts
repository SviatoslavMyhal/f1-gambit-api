import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LOBBY_BATTLE_FINISHED,
  type LobbyBattleFinishedPayload,
} from '../lobby/events/lobby.events';

/**
 * Stats side-effect for bet settlement: structured log per settled bet, decoupled from
 * BettingService/LobbyService (neither calls this directly — both just let the event fire).
 */
@Injectable()
export class BettingEventsListener {
  private readonly logger = new Logger(BettingEventsListener.name);

  @OnEvent(LOBBY_BATTLE_FINISHED)
  handleBattleFinished(payload: LobbyBattleFinishedPayload): void {
    for (const bet of payload.settledBets) {
      this.logger.log(
        `bet.settled lobbyId=${payload.lobbyId} betId=${bet.betId} bettor=${bet.bettorUserId} status=${bet.status} stake=${bet.stake} payout=${bet.payout}`,
      );
    }
  }
}
