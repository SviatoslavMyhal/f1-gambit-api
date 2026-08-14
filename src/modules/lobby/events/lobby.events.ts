/** Emitted after opponent slot is persisted (join succeeds). */
export const LOBBY_OPPONENT_JOINED = 'lobby.opponent.joined';

/** Emitted after post-simulation DB transaction commits (FINISHED + telemetry + ratings). */
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
}
