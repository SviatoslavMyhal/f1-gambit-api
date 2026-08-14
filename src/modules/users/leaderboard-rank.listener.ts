import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import {
  LOBBY_BATTLE_FINISHED,
  type LobbyBattleFinishedPayload,
} from '../lobby/events/lobby.events';
import {
  LEADERBOARD_RANK_JOB,
  LEADERBOARD_RANK_QUEUE,
} from './leaderboard-rank.constants';

/**
 * Enqueues a full leaderboard rank recompute after every race. Recomputing RANK() over the
 * whole users table is the "heavy" work Phase 1 deliberately keeps out of the synchronous
 * settlement transaction — ELO itself stays inline and atomic there.
 *
 * jobId = lobbyId: BullMQ refuses a duplicate id already waiting/active, so a burst of the
 * same event (or a settlement retry re-emitting it) can't pile up redundant jobs. The
 * recompute is also naturally idempotent — same ratings in, same ranks out — so even if it
 * did run twice nothing would double-apply.
 */
@Injectable()
export class LeaderboardRankListener {
  private readonly logger = new Logger(LeaderboardRankListener.name);

  constructor(
    @InjectQueue(LEADERBOARD_RANK_QUEUE)
    private readonly queue: Queue,
  ) {}

  @OnEvent(LOBBY_BATTLE_FINISHED)
  async handleBattleFinished(payload: LobbyBattleFinishedPayload): Promise<void> {
    await this.queue.add(
      LEADERBOARD_RANK_JOB,
      { lobbyId: payload.lobbyId },
      {
        jobId: payload.lobbyId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    this.logger.debug(
      `enqueued leaderboard rank recompute lobbyId=${payload.lobbyId}`,
    );
  }
}
