import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'uuid-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashed',
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    racesCompleted: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as User;
}

type MockRepo = jest.Mocked<Pick<Repository<User>, 'findOne' | 'save' | 'create'>>;

function makeService(): { service: AuthService; repo: MockRepo; jwt: jest.Mocked<JwtService> } {
  const repo: MockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
  const service = new AuthService(
    repo as unknown as Repository<User>,
    jwt,
  );
  return { service, repo, jwt };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException when username is already taken', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValueOnce(mockUser());

      // Act & Assert
      await expect(
        service.register({ username: 'testuser', email: 'new@example.com', password: 'pw123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email is already taken', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne
        .mockResolvedValueOnce(null)   // username free
        .mockResolvedValueOnce(mockUser()); // email taken

      // Act & Assert
      await expect(
        service.register({ username: 'newuser', email: 'test@example.com', password: 'pw123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns accessToken with user payload on success', async () => {
      // Arrange
      const { service, repo } = makeService();
      const created = mockUser({ id: 'new-uuid', username: 'newuser', email: 'new@example.com' });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      // Act
      const result = await service.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'secure123',
      });

      // Assert
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.username).toBe('newuser');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('hashes the password before saving', async () => {
      // Arrange
      const { service, repo } = makeService();
      const created = mockUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      // Act
      await service.register({ username: 'u', email: 'e@e.com', password: 'raw-password' });

      // Assert
      expect(hashSpy).toHaveBeenCalledWith('raw-password', 12);
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.login({ usernameOrEmail: 'nobody', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(mockUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        service.login({ usernameOrEmail: 'testuser', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns accessToken and user on valid credentials', async () => {
      // Arrange
      const { service, repo } = makeService();
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await service.login({ usernameOrEmail: 'testuser', password: 'correct' });

      // Assert
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.id).toBe(user.id);
      expect(result.user.username).toBe(user.username);
    });

    it('looks up user by both username and email (OR condition)', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(null);

      // Act
      try {
        await service.login({ usernameOrEmail: 'test@example.com', password: 'pw' });
      } catch {
        // UnauthorizedException expected
      }

      // Assert: repository queried with an OR condition array
      expect(repo.findOne).toHaveBeenCalledWith({
        where: [
          { username: 'test@example.com' },
          { email: 'test@example.com' },
        ],
      });
    });
  });

  describe('validateUserById', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      // Arrange
      const { service, repo } = makeService();
      repo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateUserById('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the user when found', async () => {
      // Arrange
      const { service, repo } = makeService();
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);

      // Act
      const result = await service.validateUserById('uuid-1');

      // Assert
      expect(result).toEqual(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });
  });
});
