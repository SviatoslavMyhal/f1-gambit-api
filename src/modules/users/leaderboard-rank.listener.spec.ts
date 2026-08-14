import type { Queue } from 'bullmq';
import type { LobbyBattleFinishedPayload } from '../lobby/events/lobby.events';
import {
  LEADERBOARD_RANK_JOB,
} from './leaderboard-rank.constants';
import { LeaderboardRankListener } from './leaderboard-rank.listener';

describe('LeaderboardRankListener', () => {
  let listener: LeaderboardRankListener;
  let queue: jest.Mocked<Pick<Queue, 'add'>>;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    listener = new LeaderboardRankListener(queue as unknown as Queue);
  });

  it('enqueues a recompute job keyed by lobbyId with retry/backoff configured', async () => {
    const payload: LobbyBattleFinishedPayload = {
      lobbyId: 'lobby-1',
      hostUserId: 'h',
      opponentUserId: 'o',
      winnerUserId: 'h',
      gapSeconds: 1.1,
      settledBets: [],
    };

    await listener.handleBattleFinished(payload);

    expect(queue.add).toHaveBeenCalledWith(
      LEADERBOARD_RANK_JOB,
      { lobbyId: 'lobby-1' },
      expect.objectContaining({
        jobId: 'lobby-1',
        attempts: expect.any(Number),
        backoff: { type: 'exponential', delay: expect.any(Number) },
      }),
    );
  });

  it('derives a deterministic jobId from lobbyId on every call (BullMQ dedups on that)', async () => {
    const payload: LobbyBattleFinishedPayload = {
      lobbyId: 'lobby-42',
      hostUserId: 'h',
      opponentUserId: 'o',
      winnerUserId: null,
      gapSeconds: 0,
      settledBets: [],
    };

    await listener.handleBattleFinished(payload);
    await listener.handleBattleFinished(payload);

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ jobId: 'lobby-42' }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ jobId: 'lobby-42' }),
    );
  });
});
