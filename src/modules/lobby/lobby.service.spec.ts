import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { AIService } from '../ai/ai.service';
import { SimulationService } from '../simulation/simulation.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TrackService } from '../track/track.service';
import type { Track } from '../track/entities/track.entity';
import { RatingService } from '../users/rating.service';
import type { User } from '../users/entities/user.entity';
import { Lobby } from './entities/lobby.entity';
import { LOBBY_OPPONENT_JOINED } from './events/lobby.events';
import { LobbyResponseMapper } from './lobby-response.mapper';
import { LobbyService } from './lobby.service';
import { LobbyStatus, WeatherCondition } from './lobby.types';

function minimalTrack(partial: Partial<Track> = {}): Track {
  return {
    id: partial.id ?? '11111111-1111-4111-8111-111111111111',
    slug: partial.slug ?? 'test-track',
    name: partial.name ?? 'Test',
    country: partial.country ?? 'TC',
    lengthKm: partial.lengthKm ?? 5.2,
    laps: partial.laps ?? 50,
    corners: partial.corners ?? 12,
    averageSpeedKph: partial.averageSpeedKph ?? 200,
    trackTemperatureC: partial.trackTemperatureC ?? 35,
    sectors: partial.sectors ?? [],
    corners_data: partial.corners_data ?? [],
    characteristics: partial.characteristics ?? {
      aeroSensitivity: 0.5,
      mechanicalGripWeight: 0.5,
      tireDegradationMultiplier: 1,
      overtakingDifficulty: 0.5,
      safetyCarProbability: 0.05,
    },
  };
}

describe('LobbyService', () => {
  let service: LobbyService;
  let events: { emit: jest.Mock };
  let repo: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  const hostId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const oppId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(),
      create: jest.fn(),
    };

    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyService,
        LobbyResponseMapper,
        { provide: getRepositoryToken(Lobby), useValue: repo },
        {
          provide: TrackService,
          useValue: { findById: jest.fn(), getRandomTrack: jest.fn() },
        },
        { provide: SimulationService, useValue: {} },
        { provide: TelemetryService, useValue: {} },
        { provide: RatingService, useValue: {} },
        { provide: AIService, useValue: {} },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(LobbyService);
  });

  describe('join', () => {
    it('throws when opponent tries to join own lobby', async () => {
      repo.findOne.mockResolvedValue({
        id: 'lobby-1',
        inviteCode: 'AB12CD',
        hostUserId: oppId,
        opponentUserId: null,
        status: LobbyStatus.WAITING,
        configTimeLimitMinutes: 5,
        configDeadline: null,
        trackId: 't1',
        track: minimalTrack({ id: 't1' }),
        host: { id: oppId } as User,
        opponent: null,
        weather: WeatherCondition.DRY,
        simulationSeed: 123,
        hostReady: false,
        opponentReady: false,
        hostConfig: null,
        opponentConfig: null,
        winnerUserId: null,
        simulationResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.join('ab12cd', { id: oppId } as User),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws when lobby already has opponent', async () => {
      repo.findOne.mockResolvedValue({
        id: 'lobby-1',
        inviteCode: 'AB12CD',
        hostUserId: hostId,
        opponentUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        status: LobbyStatus.WAITING,
        configTimeLimitMinutes: 5,
        configDeadline: null,
        trackId: 't1',
        track: minimalTrack({ id: 't1' }),
        host: { id: hostId } as User,
        opponent: null,
        weather: WeatherCondition.DRY,
        simulationSeed: 1,
        hostReady: false,
        opponentReady: false,
        hostConfig: null,
        opponentConfig: null,
        winnerUserId: null,
        simulationResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.join('AB12CD', { id: oppId } as User),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('updates lobby and returns configuring state', async () => {
      const afterJoin = {
        id: 'lobby-1',
        inviteCode: 'AB12CD',
        hostUserId: hostId,
        opponentUserId: oppId,
        status: LobbyStatus.CONFIGURING,
        configTimeLimitMinutes: 5,
        configDeadline: new Date(Date.now() + 300_000),
        trackId: 't1',
        track: minimalTrack({ id: 't1' }),
        host: {
          id: hostId,
          username: 'host',
          rating: 1000,
          wins: 0,
          losses: 0,
          draws: 0,
          racesCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
        opponent: {
          id: oppId,
          username: 'opp',
          rating: 1000,
          wins: 0,
          losses: 0,
          draws: 0,
          racesCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
        weather: WeatherCondition.DRY,
        simulationSeed: 42,
        hostReady: false,
        opponentReady: false,
        hostConfig: null,
        opponentConfig: null,
        winnerUserId: null,
        simulationResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repo.findOne
        .mockResolvedValueOnce({
          ...afterJoin,
          opponentUserId: null,
          status: LobbyStatus.WAITING,
          opponent: null,
          configDeadline: null,
        })
        .mockResolvedValueOnce(afterJoin);

      const out = await service.join('AB12CD', { id: oppId } as User);

      expect(repo.update).toHaveBeenCalledWith(
        {
          id: 'lobby-1',
          status: LobbyStatus.WAITING,
          opponentUserId: IsNull(),
        },
        expect.objectContaining({
          opponentUserId: oppId,
          status: LobbyStatus.CONFIGURING,
        }),
      );
      expect(out.status).toBe(LobbyStatus.CONFIGURING);
      expect(out.opponentUserId).toBe(oppId);
      expect(events.emit).toHaveBeenCalledWith(LOBBY_OPPONENT_JOINED, {
        lobbyId: 'lobby-1',
        hostUserId: hostId,
        opponentUserId: oppId,
      });
    });

    it('conflicts when join races and slot was taken', async () => {
      repo.findOne.mockResolvedValue({
        id: 'lobby-1',
        inviteCode: 'AB12CD',
        hostUserId: hostId,
        opponentUserId: null,
        status: LobbyStatus.WAITING,
        configTimeLimitMinutes: 5,
      });

      repo.update.mockResolvedValueOnce({ affected: 0, raw: [], generatedMaps: [] });

      await expect(
        service.join('AB12CD', { id: oppId } as User),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(events.emit).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        {
          id: 'lobby-1',
          status: LobbyStatus.WAITING,
          opponentUserId: IsNull(),
        },
        expect.objectContaining({
          opponentUserId: oppId,
          status: LobbyStatus.CONFIGURING,
        }),
      );
    });
  });
});
