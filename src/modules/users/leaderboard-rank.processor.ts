import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  LEADERBOARD_RANK_QUEUE,
  type LeaderboardRankJobData,
} from './leaderboard-rank.constants';

/**
 * Recomputes User.rank for every player from current ratings: one UPDATE ... FROM a
 * RANK() OVER (ORDER BY rating DESC) window query over the whole table. Idempotent —
 * a retry (or the dedup-missed double run) just recomputes the same ranks, never a delta.
 */
@Processor(LEADERBOARD_RANK_QUEUE)
export class LeaderboardRankProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaderboardRankProcessor.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {
    super();
  }

  async process(job: Job<LeaderboardRankJobData>): Promise<void> {
    await this.users.query(`
      UPDATE "users"
      SET "rank" = ranked."rnk"
      FROM (
        SELECT "id", RANK() OVER (ORDER BY "rating" DESC) AS "rnk"
        FROM "users"
      ) AS ranked
      WHERE "users"."id" = ranked."id"
    `);
    this.logger.log(
      `leaderboard ranks recomputed (triggered by lobbyId=${job.data.lobbyId})`,
    );
  }
}
