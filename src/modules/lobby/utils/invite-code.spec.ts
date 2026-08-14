import type { Repository } from 'typeorm';
import { generateInviteCode, generateUniqueInviteCode } from './invite-code';
import type { Lobby } from '../entities/lobby.entity';

describe('invite-code', () => {
  it('generateInviteCode returns 6 chars from unambiguous alphabet', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(code).not.toMatch(/[0O1I]/);
  });

  it('generateUniqueInviteCode retries until free', async () => {
    const repo = {
      exist: jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    } as unknown as Repository<Lobby>;
    const code = await generateUniqueInviteCode(repo);
    expect(code).toHaveLength(6);
    expect(repo.exist).toHaveBeenCalledTimes(2);
  });
});
