import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardEntry } from './leaderboard-entry.entity';

export type LeaderboardRow = {
  rank: number;
  playerName: string;
  score: number;
  sessionId: string;
  meta: Record<string, unknown> | null;
};

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardEntry)
    private readonly repo: Repository<LeaderboardEntry>,
  ) {}

  async top(limit = 20): Promise<LeaderboardRow[]> {
    const rows = await this.repo.find({
      order: { constructorPoints: 'DESC', createdAt: 'ASC' },
      take: limit,
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      playerName: r.playerName,
      score: r.constructorPoints,
      sessionId: r.sessionId,
      meta: r.meta,
    }));
  }

  async submit(
    sessionId: string,
    playerName: string,
    score: number,
    meta?: Record<string, unknown> | null,
  ): Promise<LeaderboardRow> {
    await this.repo.upsert(
      {
        sessionId,
        playerName,
        constructorPoints: score,
        meta: meta ?? null,
      } as Parameters<Repository<LeaderboardEntry>['upsert']>[0],
      ['sessionId'],
    );
    const higher = await this.repo
      .createQueryBuilder('e')
      .where('e.constructorPoints > :score', { score })
      .getCount();
    return {
      rank: higher + 1,
      sessionId,
      playerName,
      score,
      meta: meta ?? null,
    };
  }
}
