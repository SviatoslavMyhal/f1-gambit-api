import { UnprocessableEntityException } from '@nestjs/common';
import { SetupService } from '../setup.service';
import { SessionsService } from '../../sessions/sessions.service';
import { TireCompound } from '../dto/tire-compound';

const VALID_SETUP = {
  frontWing: 6,
  rearWing: 7,
  suspensionStiffness: 5,
  brakeBias: 58,
  rideHeight: 5,
  differentialOnThrottle: 75,
  startingCompound: TireCompound.MEDIUM,
  fuelLoad: 3,
};

function makeService(): { service: SetupService; sessions: jest.Mocked<Pick<SessionsService, 'updateCarSetup' | 'findOne'>> } {
  const sessions = {
    updateCarSetup: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue({ id: 'session-1' }),
  };
  const service = new SetupService(sessions as unknown as SessionsService);
  return { service, sessions };
}

describe('SetupService.submit', () => {
  describe('valid setup', () => {
    it('returns setup, empty validationWarnings, and strategyRecommendations', async () => {
      // Arrange
      const { service } = makeService();

      // Act
      const result = await service.submit('session-1', VALID_SETUP);

      // Assert
      expect(result.setup).toBeDefined();
      expect(result.validationWarnings).toEqual([]);
      expect(result.strategyRecommendations).toHaveLength(2);
    });

    it('persists the setup via sessions.updateCarSetup', async () => {
      // Arrange
      const { service, sessions } = makeService();

      // Act
      await service.submit('session-1', VALID_SETUP);

      // Assert
      expect(sessions.updateCarSetup).toHaveBeenCalledWith('session-1', expect.any(Object));
    });
  });

  describe('porpoising warning', () => {
    it('warns when combined wing (frontWing + rearWing) > 18 and rideHeight < 4', async () => {
      // Arrange
      const { service } = makeService();
      const setup = { ...VALID_SETUP, frontWing: 10, rearWing: 9, rideHeight: 3 };

      // Act
      const result = await service.submit('session-1', setup);

      // Assert
      expect(result.validationWarnings).toContain(
        'High combined wing with low ride height may increase porpoising risk.',
      );
    });

    it('does not warn when combined wing is ≤ 18 even with low rideHeight', async () => {
      // Arrange
      const { service } = makeService();
      const setup = { ...VALID_SETUP, frontWing: 9, rearWing: 9, rideHeight: 3 };

      // Act
      const result = await service.submit('session-1', setup);

      // Assert
      expect(result.validationWarnings).not.toContain(
        expect.stringContaining('porpoising'),
      );
    });

    it('does not warn when rideHeight is 4 (boundary — no warning)', async () => {
      // Arrange
      const { service } = makeService();
      const setup = { ...VALID_SETUP, frontWing: 11, rearWing: 9, rideHeight: 4 };

      // Act
      const result = await service.submit('session-1', setup);

      // Assert
      expect(result.validationWarnings.some((w) => w.includes('porpoising'))).toBe(false);
    });
  });

  describe('brake bias warning', () => {
    it('warns when brakeBias < 54', async () => {
      // Arrange
      const { service } = makeService();
      const setup = { ...VALID_SETUP, brakeBias: 53 };

      // Act
      const result = await service.submit('session-1', setup);

      // Assert
      expect(result.validationWarnings).toContain(
        'Rearward brake bias increases lock-up risk in slow corners.',
      );
    });

    it('does not warn when brakeBias is exactly 54 (boundary)', async () => {
      // Arrange
      const { service } = makeService();
      const setup = { ...VALID_SETUP, brakeBias: 54 };

      // Act
      const result = await service.submit('session-1', setup);

      // Assert
      expect(result.validationWarnings.some((w) => w.includes('brake'))).toBe(false);
    });
  });

  describe('validation errors', () => {
    it('throws UnprocessableEntityException when frontWing is below minimum (< 1)', async () => {
      // Arrange
      const { service } = makeService();

      // Act & Assert
      await expect(
        service.submit('session-1', { ...VALID_SETUP, frontWing: 0 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when frontWing exceeds maximum (> 11)', async () => {
      // Arrange
      const { service } = makeService();

      // Act & Assert
      await expect(
        service.submit('session-1', { ...VALID_SETUP, frontWing: 12 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when brakeBias is below minimum (< 52)', async () => {
      // Arrange
      const { service } = makeService();

      // Act & Assert
      await expect(
        service.submit('session-1', { ...VALID_SETUP, brakeBias: 51 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when startingCompound is invalid', async () => {
      // Arrange
      const { service } = makeService();

      // Act & Assert
      await expect(
        service.submit('session-1', { ...VALID_SETUP, startingCompound: 'SUPERSOFT' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when a required field is missing', async () => {
      // Arrange
      const { service } = makeService();
      const { frontWing: _omitted, ...withoutFrontWing } = VALID_SETUP;

      // Act & Assert
      await expect(
        service.submit('session-1', withoutFrontWing),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('error response includes the failing property name', async () => {
      // Arrange
      const { service } = makeService();

      // Act & Assert
      try {
        await service.submit('session-1', { ...VALID_SETUP, rideHeight: 99 });
        fail('expected exception');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const body = (e as UnprocessableEntityException).getResponse() as { errors: Array<{ property: string }> };
        expect(body.errors.some((err) => err.property === 'rideHeight')).toBe(true);
      }
    });
  });
});
