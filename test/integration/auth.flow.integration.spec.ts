import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { User } from '../../src/modules/users/entities/user.entity';

const TEST_SECRET = 'integration-test-secret-do-not-use-in-prod';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'uuid-player-1',
    username: 'player1',
    email: 'player1@test.com',
    passwordHash: '',
    rating: 1200,
    wins: 0, losses: 0, draws: 0, racesCompleted: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as User;
}

describe('Auth flow — integration', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };

    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(TEST_SECRET) } },
      ],
    }).compile();

    authService  = module.get(AuthService);
    jwtService   = module.get(JwtService);
    jwtStrategy  = module.get(JwtStrategy);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── register → JWT ──────────────────────────────────────────────────
  describe('register → JWT round-trip', () => {
    it('produces a JWT that verifies with the same secret', async () => {
      // Arrange
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      // Act
      const { accessToken } = await authService.register({
        username: 'player1', email: 'player1@test.com', password: 'secret123',
      });

      // Assert — real jwtService.verify (not mocked)
      expect(() => jwtService.verify(accessToken)).not.toThrow();
    });

    it('JWT payload contains sub=userId and username', async () => {
      // Arrange
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      // Act
      const { accessToken } = await authService.register({
        username: 'player1', email: 'player1@test.com', password: 'secret123',
      });
      const decoded = jwtService.verify<{ sub: string; username: string }>(accessToken);

      // Assert
      expect(decoded.sub).toBe(user.id);
      expect(decoded.username).toBe(user.username);
    });

    it('JWT from register flows through JwtStrategy.validate and returns the user', async () => {
      // Arrange
      const user = makeUser();
      repo.findOne
        .mockResolvedValueOnce(null)  // username uniqueness check
        .mockResolvedValueOnce(null)  // email uniqueness check
        .mockResolvedValue(user);     // validateUserById called by jwtStrategy.validate
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      // Act
      const { accessToken } = await authService.register({
        username: 'player1', email: 'player1@test.com', password: 'secret123',
      });
      const payload = jwtService.verify<{ sub: string; username: string }>(accessToken);
      const resolved = await jwtStrategy.validate(payload);

      // Assert — full cycle: register → sign → verify → validate
      expect(resolved.id).toBe(user.id);
      expect(resolved.username).toBe(user.username);
    });
  });

  // ── login → JWT ──────────────────────────────────────────────────────
  describe('login → JWT round-trip', () => {
    it('login with correct password returns a verifiable JWT', async () => {
      // Arrange: hash a real password with real bcrypt
      const rawPassword = 'correcthorsebatterystaple';
      const hash = await bcrypt.hash(rawPassword, 4); // low cost for tests
      const user = makeUser({ passwordHash: hash });
      repo.findOne.mockResolvedValue(user);

      // Act
      const { accessToken } = await authService.login({
        usernameOrEmail: 'player1', password: rawPassword,
      });
      const decoded = jwtService.verify<{ sub: string }>(accessToken);

      // Assert
      expect(decoded.sub).toBe(user.id);
    });

    it('wrong password → UnauthorizedException, no token issued', async () => {
      // Arrange
      const hash = await bcrypt.hash('correct-password', 4);
      repo.findOne.mockResolvedValue(makeUser({ passwordHash: hash }));

      // Act & Assert
      const { UnauthorizedException } = await import('@nestjs/common');
      await expect(
        authService.login({ usernameOrEmail: 'player1', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── JWT security edge cases ───────────────────────────────────────────
  describe('JWT security', () => {
    it('arbitrary string is not a valid JWT', () => {
      expect(() => jwtService.verify('not.a.jwt')).toThrow();
    });

    it('token signed with a different secret is rejected', () => {
      const impostor = new JwtService({}).sign(
        { sub: 'evil-user-id' },
        { secret: 'wrong-secret' },
      );
      expect(() => jwtService.verify(impostor)).toThrow();
    });

    it('tampered payload is rejected', () => {
      // Manually swap out the payload segment of a real token
      const real = jwtService.sign({ sub: 'user-1', username: 'player1' });
      const [header, , sig] = real.split('.');
      const tampered = `${header}.${Buffer.from(JSON.stringify({ sub: 'admin', username: 'hacker' })).toString('base64url')}.${sig}`;
      expect(() => jwtService.verify(tampered)).toThrow();
    });
  });
});
