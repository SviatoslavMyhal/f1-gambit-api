/**
 * Integration: LobbyService.join with real NestJS DI wiring
 *
 * What we test here that unit tests don't:
 *  - Real LobbyResponseMapper (injected by DI, not mocked) strips TypeORM
 *    metadata and returns a plain LobbyResponse.
 *  - Real EventEmitter2 instance actually emits; we listen and receive the
 *    LOBBY_OPPONENT_JOINED payload.
 *  - NestJS dependency-injection graph resolves without errors for the subset
 *    of providers needed by the join path.
 */

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LobbyService } from '../../src/modules/lobby/lobby.service';
import { LobbyResponseMapper } from '../../src/modules/lobby/lobby-response.mapper';
import { LOBBY_OPPONENT_JOINED } from '../../src/modules/lobby/events/lobby.events';
import { Lobby } from '../../src/modules/lobby/entities/lobby.entity';
import { LobbyStatus, WeatherCondition } from '../../src/modules/lobby/lobby.types';
import { User } from '../../src/modules/users/entities/user.entity';
import { Track } from '../../src/modules/track/entities/track.entity';
import { TrackService } from '../../src/modules/track/track.service';
import { SimulationService } from '../../src/modules/simulation/simulation.service';
import { TelemetryService } from '../../src/modules/telemetry/telemetry.service';
import { RatingService } from '../../src/modules/users/rating.service';
import { AIService } from '../../src/modules/ai/ai.service';

// ── fixtures ─────────────────────────────────────────────────────────────────

function makeUser(id: string, username = 'player'): User {
  return {
    id, username, email: `${username}@test.com`,
    passwordHash: 'hash', rating: 1200,
    wins: 0, losses: 0, draws: 0, racesCompleted: 0,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  } as User;
}

function makeTrack(): Track {
  return {
    id: 'track-uuid', name: 'Monza', slug: 'monza',
    country: 'Italy', laps: 53, corners: 11,
    trackTemperatureC: 35, averageSpeedKph: 240,
  } as Track;
}

function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  return {
    id: 'lobby-uuid',
    inviteCode: 'ABC123',
    hostUserId: 'host-uuid',
    host: makeUser('host-uuid', 'host'),
    opponentUserId: null,
    opponent: null,
    status: LobbyStatus.WAITING,
    configTimeLimitMinutes: 5,
    configDeadline: null,
    trackId: 'track-uuid',
    track: makeTrack(),
    weather: WeatherCondition.DRY,
    simulationSeed: 12345,
    hostReady: false,
    opponentReady: false,
    hostConfig: null,
    opponentConfig: null,
    winnerUserId: null,
    simulationResult: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Lobby;
}

// ── module factory ────────────────────────────────────────────────────────────

async function buildModule() {
  const lobbyRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exist: jest.fn(),
  };

  const realEmitter = new EventEmitter2();

  const module = await Test.createTestingModule({
    providers: [
      LobbyService,
      LobbyResponseMapper,
      { provide: EventEmitter2,              useValue: realEmitter },
      { provide: getRepositoryToken(Lobby),  useValue: lobbyRepo },
      { provide: TrackService,      useValue: {} },
      { provide: SimulationService, useValue: {} },
      { provide: TelemetryService,  useValue: {} },
      { provide: RatingService,     useValue: {} },
      { provide: AIService,         useValue: {} },
    ],
  }).compile();

  return {
    service:  module.get(LobbyService),
    emitter:  realEmitter,
    lobbyRepo,
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('LobbyService.join — integration (real mapper + real emitter)', () => {
  afterEach(() => jest.resetAllMocks());

  it('LOBBY_OPPONENT_JOINED is emitted on the real EventEmitter2 with correct payload', async () => {
    const { service, emitter, lobbyRepo } = await buildModule();
    const opponent = makeUser('opp-uuid', 'opponent');
    const lobby    = makeLobby();
    const joined   = makeLobby({
      opponentUserId: 'opp-uuid',
      opponent: opponent,
      status: LobbyStatus.CONFIGURING,
    });

    lobbyRepo.findOne
      .mockResolvedValueOnce(lobby)   // preview lookup (by inviteCode)
      .mockResolvedValueOnce(joined); // final lookup (by id, for response)
    lobbyRepo.update.mockResolvedValue({ affected: 1 });

    // Listen on the real emitter before calling join
    const received: unknown[] = [];
    emitter.on(LOBBY_OPPONENT_JOINED, (payload) => received.push(payload));

    await service.join('ABC123', opponent);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ lobbyId: lobby.id, opponentUserId: opponent.id });
  });

  it('LobbyResponseMapper (real, not mocked) maps the joined lobby to a plain LobbyResponse', async () => {
    const { service, lobbyRepo } = await buildModule();
    const opponent = makeUser('opp-uuid', 'opponent');
    const lobby    = makeLobby();
    const joined   = makeLobby({
      opponentUserId: 'opp-uuid',
      opponent: opponent,
      status: LobbyStatus.CONFIGURING,
    });

    lobbyRepo.findOne
      .mockResolvedValueOnce(lobby)
      .mockResolvedValueOnce(joined);
    lobbyRepo.update.mockResolvedValue({ affected: 1 });

    const response = await service.join('ABC123', opponent);

    // LobbyResponseMapper returns a plain object — key fields should be present
    expect(response.id).toBe(lobby.id);
    expect(response.status).toBe(LobbyStatus.CONFIGURING);
    expect(response.inviteCode).toBe(lobby.inviteCode);
    // Mapper strips TypeORM entity class — result must not be a Lobby instance
    expect(response).not.toBeInstanceOf(Lobby);
  });

  it('no event is emitted when the race condition guard fires (affected=0)', async () => {
    const { service, emitter, lobbyRepo } = await buildModule();
    const opponent = makeUser('opp-uuid', 'opponent');

    lobbyRepo.findOne.mockResolvedValue(makeLobby());
    lobbyRepo.update.mockResolvedValue({ affected: 0 }); // somebody else joined first

    const spy = jest.spyOn(emitter, 'emit');

    const { ConflictException } = await import('@nestjs/common');
    await expect(service.join('ABC123', opponent)).rejects.toThrow(ConflictException);
    expect(spy).not.toHaveBeenCalledWith(LOBBY_OPPONENT_JOINED, expect.anything());
  });

  it('host cannot join their own lobby → BadRequestException, no event emitted', async () => {
    const { service, emitter, lobbyRepo } = await buildModule();
    const host = makeUser('host-uuid', 'host');

    lobbyRepo.findOne.mockResolvedValue(makeLobby({ hostUserId: host.id }));

    const spy = jest.spyOn(emitter, 'emit');

    const { BadRequestException } = await import('@nestjs/common');
    await expect(service.join('ABC123', host)).rejects.toThrow(BadRequestException);
    expect(spy).not.toHaveBeenCalledWith(LOBBY_OPPONENT_JOINED, expect.anything());
  });

  it('joining a non-WAITING lobby → BadRequestException', async () => {
    const { service, lobbyRepo } = await buildModule();
    const opponent = makeUser('opp-uuid', 'opponent');

    lobbyRepo.findOne.mockResolvedValue(
      makeLobby({ status: LobbyStatus.CONFIGURING }),
    );

    const { BadRequestException } = await import('@nestjs/common');
    await expect(service.join('ABC123', opponent)).rejects.toThrow(BadRequestException);
  });
});
