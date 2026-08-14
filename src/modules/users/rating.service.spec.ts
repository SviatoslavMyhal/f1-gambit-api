import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RatingService } from './rating.service';

function user(partial: Partial<User> & Pick<User, 'id' | 'rating'>): User {
  return {
    username: 'u',
    email: 'u@x.com',
    passwordHash: 'x',
    wins: 0,
    losses: 0,
    draws: 0,
    racesCompleted: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as User;
}

describe('RatingService', () => {
  let service: RatingService;
  let repo: jest.Mocked<Pick<Repository<User>, 'findOneOrFail' | 'update'>>;

  beforeEach(() => {
    repo = {
      findOneOrFail: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repo),
    };
    (repo as unknown as { manager: typeof manager }).manager = manager;
    service = new RatingService(repo as unknown as Repository<User>);
  });

  it('winner gains rating, loser loses rating', async () => {
    const h = user({ id: 'h', rating: 1500 });
    const o = user({ id: 'o', rating: 1500 });
    repo.findOneOrFail
      .mockResolvedValueOnce(h)
      .mockResolvedValueOnce(o);

    const out = await service.processResult('h', 'o', 'h');
    expect(out[0]!.delta).toBeGreaterThan(0);
    expect(out[1]!.delta).toBeLessThan(0);
  });

  it('upset win yields larger rating gain than beating an equal-rated opponent', async () => {
    const low = user({ id: 'h', rating: 1200 });
    const high = user({ id: 'o', rating: 1800 });
    repo.findOneOrFail
      .mockResolvedValueOnce({ ...low })
      .mockResolvedValueOnce({ ...high });
    const upset = await service.processResult('h', 'o', 'h');

    const midA = user({ id: 'a', rating: 1500 });
    const midB = user({ id: 'b', rating: 1500 });
    repo.findOneOrFail
      .mockResolvedValueOnce({ ...midA })
      .mockResolvedValueOnce({ ...midB });
    const even = await service.processResult('a', 'b', 'a');

    expect(upset[0]!.delta).toBeGreaterThan(even[0]!.delta);
  });

  it('draw yields small deltas for equal ratings', async () => {
    const h = user({ id: 'h', rating: 1500 });
    const o = user({ id: 'o', rating: 1500 });
    repo.findOneOrFail
      .mockResolvedValueOnce(h)
      .mockResolvedValueOnce(o);
    const out = await service.processResult('h', 'o', null);
    expect(out[0]!.delta + out[1]!.delta).toBe(0);
    expect(Math.abs(out[0]!.delta)).toBeLessThanOrEqual(16);
  });

  it('high-rated player uses K=16', async () => {
    const h = user({ id: 'h', rating: 2100 });
    const o = user({ id: 'o', rating: 1500 });
    repo.findOneOrFail
      .mockResolvedValueOnce(h)
      .mockResolvedValueOnce(o);
    const out = await service.processResult('h', 'o', 'o');
    expect(Math.abs(out[0]!.delta)).toBeLessThanOrEqual(16);
  });

  it('rating floor at 100', async () => {
    const h = user({ id: 'h', rating: 100 });
    const o = user({ id: 'o', rating: 2500 });
    repo.findOneOrFail
      .mockResolvedValueOnce(h)
      .mockResolvedValueOnce(o);
    const out = await service.processResult('h', 'o', 'o');
    expect(out[0]!.newRating).toBe(100);
  });

  it('increments wins/losses and racesCompleted', async () => {
    const h = user({ id: 'h', rating: 1500, wins: 2, losses: 1, draws: 0, racesCompleted: 3 });
    const o = user({ id: 'o', rating: 1500, wins: 1, losses: 2, draws: 0, racesCompleted: 3 });
    repo.findOneOrFail
      .mockResolvedValueOnce(h)
      .mockResolvedValueOnce(o);
    await service.processResult('h', 'o', 'h');
    expect(repo.update).toHaveBeenCalledWith(
      'h',
      expect.objectContaining({
        wins: 3,
        losses: 1,
        racesCompleted: 4,
      }),
    );
    expect(repo.update).toHaveBeenCalledWith(
      'o',
      expect.objectContaining({
        wins: 1,
        losses: 3,
        racesCompleted: 4,
      }),
    );
  });
});
