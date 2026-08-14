import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { CarSetupDto } from '../setup/dto/car-setup.dto';
import { SimulationService } from '../simulation/simulation.service';
import { buildStoredMultiplayerSimulationResult } from '../simulation/multiplayer-stored-result.builder';
import { raceStrategyDtoToRaceStrategy } from '../simulation/race-strategy.mapper';
import type { RaceStrategyDto } from '../simulation/dto/race-strategy.dto';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TrackService } from '../track/track.service';
import { RatingService } from '../users/rating.service';
import { User } from '../users/entities/user.entity';
import { AIService } from '../ai/ai.service';
import { Lobby } from './entities/lobby.entity';
import type { CreateLobbyDto } from './dto/create-lobby.dto';
import { LobbyStatus, WeatherCondition, type PlayerConfig } from './lobby.types';
import { generateUniqueInviteCode } from './utils/invite-code';
import { formatLobbySimulationSummaryPlainText } from './utils/lobby-summary-export.format';
import { LobbyResponseMapper } from './lobby-response.mapper';
import type { LobbyResponse } from './lobby-response.mapper';
import {
  LOBBY_BATTLE_FINISHED,
  LOBBY_OPPONENT_JOINED,
} from './events/lobby.events';

export type { LobbyResponse } from './lobby-response.mapper';

@Injectable()
export class LobbyService {
  constructor(
    @InjectRepository(Lobby)
    private readonly lobbies: Repository<Lobby>,
    private readonly tracks: TrackService,
    private readonly simulation: SimulationService,
    private readonly telemetry: TelemetryService,
    private readonly rating: RatingService,
    private readonly ai: AIService,
    private readonly lobbyResponse: LobbyResponseMapper,
    private readonly events: EventEmitter2,
  ) {}

  async create(hostUser: User, dto: CreateLobbyDto): Promise<LobbyResponse> {
    const track = await this.tracks.getRandomTrack();
    const weather = this.randomWeather();
    const lobby = this.lobbies.create({
      inviteCode: await generateUniqueInviteCode(this.lobbies),
      hostUserId: hostUser.id,
      status: LobbyStatus.WAITING,
      configTimeLimitMinutes: dto.configTimeLimitMinutes ?? 5,
      trackId: track.id,
      weather,
      simulationSeed: randomInt(1, 0x7fff_fffe),
      hostReady: false,
      opponentReady: false,
    });
    const saved = await this.lobbies.save(lobby);
    return this.lobbyResponse.toLobbyResponse(await this.findOne(saved.id));
  }

  async join(inviteCode: string, opponent: User): Promise<LobbyResponse> {
    const code = inviteCode.trim().toUpperCase();
    const preview = await this.lobbies.findOne({
      where: { inviteCode: code },
      select: {
        id: true,
        hostUserId: true,
        opponentUserId: true,
        status: true,
        configTimeLimitMinutes: true,
      },
    });

    if (!preview) {
      throw new NotFoundException(`No lobby with code ${inviteCode}`);
    }

    if (preview.status !== LobbyStatus.WAITING) {
      throw new BadRequestException(
        `Lobby is not accepting players (status: ${preview.status})`,
      );
    }
    if (preview.hostUserId === opponent.id) {
      throw new BadRequestException('Cannot join your own lobby');
    }
    if (preview.opponentUserId != null) {
      throw new BadRequestException('Lobby is already full');
    }

    const deadline = new Date(
      Date.now() + preview.configTimeLimitMinutes * 60 * 1000,
    );

    const updated = await this.lobbies.update(
      {
        id: preview.id,
        status: LobbyStatus.WAITING,
        opponentUserId: IsNull(),
      },
      {
        opponentUserId: opponent.id,
        status: LobbyStatus.CONFIGURING,
        configDeadline: deadline,
      },
    );

    if (!updated.affected) {
      throw new ConflictException(
        'Lobby is full or no longer accepting players',
      );
    }

    this.events.emit(LOBBY_OPPONENT_JOINED, {
      lobbyId: preview.id,
      hostUserId: preview.hostUserId,
      opponentUserId: opponent.id,
    });

    return this.lobbyResponse.toLobbyResponse(await this.findOne(preview.id));
  }

  async submitConfig(
    lobbyId: string,
    user: User,
    setup: CarSetupDto,
    strategy: RaceStrategyDto,
  ): Promise<LobbyResponse> {
    const lobby = await this.findOne(lobbyId);
    this.assertUserInLobby(user.id, lobby);
    this.assertStatus(lobby, LobbyStatus.CONFIGURING);

    const mergedSetup = plainToInstance(CarSetupDto, setup);
    mergedSetup.startingCompound = strategy.startingCompound;
    const setupErr = await validate(mergedSetup);
    if (setupErr.length) {
      throw new UnprocessableEntityException({
        message: 'Invalid car setup',
        errors: setupErr.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
      });
    }
    const stratErr = await validate(strategy);
    if (stratErr.length) {
      throw new UnprocessableEntityException({
        message: 'Invalid strategy',
        errors: stratErr.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
      });
    }

    const raceStrategy = raceStrategyDtoToRaceStrategy(strategy, lobby.track.laps);
    const config: PlayerConfig = {
      userId: user.id,
      setup: mergedSetup,
      strategy: raceStrategy,
      submittedAt: new Date().toISOString(),
    };

    if (lobby.hostUserId === user.id) {
      lobby.hostConfig = config;
      lobby.hostReady = true;
    } else {
      lobby.opponentConfig = config;
      lobby.opponentReady = true;
    }
    await this.lobbies.save(lobby);

    const reloaded = await this.findOne(lobbyId);
    if (
      reloaded.hostReady &&
      reloaded.opponentReady &&
      reloaded.status === LobbyStatus.CONFIGURING
    ) {
      return this.lobbyResponse.toLobbyResponse(await this.startSimulation(reloaded));
    }
    return this.lobbyResponse.toLobbyResponse(reloaded);
  }

  async getLobbyState(lobbyId: string, user: User): Promise<LobbyResponse> {
    const lobby = await this.findOne(lobbyId);
    this.assertUserInLobby(user.id, lobby);
    const updated = await this.checkAndAutoStartInternal(lobbyId);
    return this.lobbyResponse.toLobbyResponse(updated);
  }

  async getResults(lobbyId: string, user: User): Promise<LobbyResponse> {
    const lobby = await this.findOne(lobbyId);
    this.assertUserInLobby(user.id, lobby);
    if (lobby.status !== LobbyStatus.FINISHED) {
      throw new BadRequestException('Lobby is not finished');
    }
    return this.lobbyResponse.toLobbyResponse(lobby);
  }

  async findOne(id: string): Promise<Lobby> {
    const lobby = await this.lobbies.findOne({
      where: { id },
      relations: ['host', 'opponent', 'track'],
    });
    if (!lobby) throw new NotFoundException(`Lobby ${id} not found`);
    await this.ensureTrackLoaded(lobby);
    return lobby;
  }

  async findByCode(code: string): Promise<Lobby> {
    const lobby = await this.lobbies.findOne({
      where: { inviteCode: code.trim().toUpperCase() },
      relations: ['host', 'opponent', 'track'],
    });
    if (!lobby) throw new NotFoundException(`No lobby with code ${code}`);
    await this.ensureTrackLoaded(lobby);
    return lobby;
  }

  private async checkAndAutoStartInternal(lobbyId: string): Promise<Lobby> {
    let lobby = await this.findOne(lobbyId);
    if (lobby.status !== LobbyStatus.CONFIGURING) return lobby;
    if (!lobby.opponentUserId) return lobby;

    const deadlinePassed =
      lobby.configDeadline != null && new Date() > lobby.configDeadline;
    const bothReady = lobby.hostReady && lobby.opponentReady;

    if (!bothReady && !deadlinePassed) return lobby;

    let changed = false;
    if (!lobby.hostConfig) {
      lobby.hostConfig = await this.ai.generateConfig(
        lobby.track,
        lobby.weather,
        'balanced',
        lobby.hostUserId,
      );
      changed = true;
    }
    if (!lobby.opponentConfig) {
      lobby.opponentConfig = await this.ai.generateConfig(
        lobby.track,
        lobby.weather,
        'balanced',
        lobby.opponentUserId!,
      );
      changed = true;
    }
    if (deadlinePassed && (!lobby.hostReady || !lobby.opponentReady)) {
      lobby.hostReady = true;
      lobby.opponentReady = true;
      changed = true;
    }
    if (changed) await this.lobbies.save(lobby);

    lobby = await this.findOne(lobbyId);
    if (
      lobby.status === LobbyStatus.CONFIGURING &&
      lobby.hostReady &&
      lobby.opponentReady &&
      lobby.hostConfig &&
      lobby.opponentConfig
    ) {
      return this.startSimulation(lobby);
    }
    return lobby;
  }

  private async startSimulation(lobby: Lobby): Promise<Lobby> {
    const swap = await this.lobbies.update(
      { id: lobby.id, status: LobbyStatus.CONFIGURING },
      { status: LobbyStatus.SIMULATING },
    );
    if (!swap.affected) {
      return this.findOne(lobby.id);
    }

    const full = await this.findOne(lobby.id);
    if (
      !full.hostConfig ||
      !full.opponentConfig ||
      !full.opponentUserId
    ) {
      await this.lobbies.update(full.id, { status: LobbyStatus.CONFIGURING });
      throw new BadRequestException('Lobby not ready for simulation');
    }

    const hostUserId = full.hostUserId;
    const opponentUserId = full.opponentUserId;

    try {
      const result = await this.simulation.runMultiplayer({
        trackEntity: full.track,
        weather: full.weather,
        seed: full.simulationSeed,
        hostConfig: full.hostConfig,
        opponentConfig: full.opponentConfig,
        hostTelemetrySessionId: `${full.id}:host`,
        opponentTelemetrySessionId: `${full.id}:opponent`,
      });

      await this.lobbies.manager.transaction(async (manager: EntityManager) => {
        await this.telemetry.persistMultiplayer(full.id, result, manager);

        const ratingChanges = await this.rating.processResultInTransaction(
          manager,
          hostUserId,
          opponentUserId,
          result.winner,
        );

        const simulationResult = buildStoredMultiplayerSimulationResult(
          result,
          ratingChanges,
          full.track,
        );

        await manager.getRepository(Lobby).update(full.id, {
          status: LobbyStatus.FINISHED,
          winnerUserId: result.winner,
          simulationResult: simulationResult as object,
        });
      });

      this.events.emit(LOBBY_BATTLE_FINISHED, {
        lobbyId: full.id,
        hostUserId,
        opponentUserId,
        winnerUserId: result.winner,
        gapSeconds: result.gapSeconds,
      });
    } catch (e) {
      await this.lobbies.update(lobby.id, { status: LobbyStatus.CONFIGURING });
      throw e;
    }

    return this.findOne(lobby.id);
  }

  async getSummaryExport(
    lobbyId: string,
    user: User,
  ): Promise<{ plainText: string; json: Record<string, unknown> }> {
    const lobby = await this.findOne(lobbyId);
    this.assertUserInLobby(user.id, lobby);
    if (lobby.status !== LobbyStatus.FINISHED) {
      throw new BadRequestException('Lobby is not finished');
    }
    const raw = lobby.simulationResult;
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('No simulation result');
    }
    const json = raw as Record<string, unknown>;
    const plainText = formatLobbySimulationSummaryPlainText(json, {
      inviteCode: lobby.inviteCode,
      trackName: lobby.track?.name,
      trackSlug: lobby.track?.slug,
    });
    return { plainText, json };
  }

  private async ensureTrackLoaded(lobby: Lobby): Promise<void> {
    if (!lobby.track) {
      lobby.track = await this.tracks.findById(lobby.trackId);
    }
  }

  private assertUserInLobby(userId: string, lobby: Lobby): void {
    if (lobby.hostUserId !== userId && lobby.opponentUserId !== userId) {
      throw new ForbiddenException('You are not a member of this lobby');
    }
  }

  private assertStatus(lobby: Lobby, expected: LobbyStatus): void {
    if (lobby.status !== expected) {
      throw new BadRequestException(
        `Expected lobby status '${expected}', got '${lobby.status}'`,
      );
    }
  }

  private randomWeather(): WeatherCondition {
    const roll = Math.random();
    if (roll < 0.6) return WeatherCondition.DRY;
    if (roll < 0.85) return WeatherCondition.MIXED;
    return WeatherCondition.WET;
  }
}
