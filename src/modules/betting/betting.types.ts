export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  REFUNDED = 'refunded',
}

/** One settled bet, carried on `LobbyBattleFinishedPayload` for stats listeners. */
export interface BetSettlementSummary {
  betId: string;
  bettorUserId: string;
  status: BetStatus;
  stake: number;
  payout: number;
}
