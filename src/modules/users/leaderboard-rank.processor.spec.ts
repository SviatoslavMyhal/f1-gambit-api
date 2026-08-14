import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LeaderboardRankProcessor } from './leaderboard-rank.processor';

describe('LeaderboardRankProcessor', () => {
  it('runs a single window-function UPDATE over the whole users table', async () => {
    const users: jest.Mocked<Pick<Repository<User>, 'query'>> = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new LeaderboardRankProcessor(users as unknown as Repository<User>);

    await processor.process({ data: { lobbyId: 'lobby-1' } } as any);

    expect(users.query).toHaveBeenCalledTimes(1);
    const sql = users.query.mock.calls[0]![0] as string;
    expect(sql).toContain('UPDATE "users"');
    expect(sql).toContain('RANK() OVER');
    expect(sql).toContain('ORDER BY "rating" DESC');
  });
});
