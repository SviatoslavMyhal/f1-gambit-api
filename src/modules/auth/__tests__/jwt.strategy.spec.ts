import { ConfigService } from '@nestjs/config';
import type { User } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

function mockUser(): User {
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
  } as User;
}

function makeStrategy(validateUserById = jest.fn()) {
  const authService = { validateUserById } as unknown as AuthService;
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;
  const strategy = new JwtStrategy(authService, configService);
  return { strategy, validateUserById };
}

describe('JwtStrategy', () => {
  it('validate delegates to auth.validateUserById with the sub claim', async () => {
    // Arrange
    const user = mockUser();
    const { strategy, validateUserById } = makeStrategy(
      jest.fn().mockResolvedValue(user),
    );

    // Act
    await strategy.validate({ sub: 'uuid-1', username: 'testuser' });

    // Assert
    expect(validateUserById).toHaveBeenCalledWith('uuid-1');
  });

  it('validate returns the user resolved by validateUserById', async () => {
    // Arrange
    const user = mockUser();
    const { strategy } = makeStrategy(jest.fn().mockResolvedValue(user));

    // Act
    const result = await strategy.validate({ sub: 'uuid-1', username: 'testuser' });

    // Assert
    expect(result).toEqual(user);
  });

  it('propagates UnauthorizedException when validateUserById throws', async () => {
    // Arrange
    const { UnauthorizedException } = await import('@nestjs/common');
    const { strategy } = makeStrategy(
      jest.fn().mockRejectedValue(new UnauthorizedException('Token invalid or expired')),
    );

    // Act & Assert
    await expect(
      strategy.validate({ sub: 'bad-id', username: 'ghost' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
