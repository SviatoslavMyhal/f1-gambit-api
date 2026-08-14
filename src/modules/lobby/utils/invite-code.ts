import { randomInt } from 'crypto';
import type { Repository } from 'typeorm';
import type { Lobby } from '../entities/lobby.entity';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    '',
  );
}

export async function generateUniqueInviteCode(
  repo: Repository<Lobby>,
): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const code = generateInviteCode();
    const exists = await repo.exist({ where: { inviteCode: code } });
    if (!exists) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique invite code');
}
