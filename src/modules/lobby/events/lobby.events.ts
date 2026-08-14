import type { BetSettlementSummary } from '../../betting/betting.types';

/** Emitted after opponent slot is persisted (join succeeds). */
export const LOBBY_OPPONENT_JOINED = 'lobby.opponent.joined';

/**
 * Emitted after the settlement transaction commits (FINISHED + telemetry + ratings + bets).
 * Side effects (socket notification, bet-stats logging) hang off this event instead of being
 * called directly from LobbyService, so LobbyService stays ignorant of who's listening.
 */
export const LOBBY_BATTLE_FINISHED = 'lobby.battle.finished';

export interface LobbyOpponentJoinedPayload {
  lobbyId: string;
  hostUserId: string;
  opponentUserId: string;
}

export interface LobbyBattleFinishedPayload {
  lobbyId: string;
  hostUserId: string;
  opponentUserId: string;
  winnerUserId: string | null;
  gapSeconds: number;
  settledBets: BetSettlementSummary[];
}
