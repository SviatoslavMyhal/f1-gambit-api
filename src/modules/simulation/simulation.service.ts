import { createHash, randomUUID } from 'crypto';
import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import type { PlayerConfig } from '../lobby/lobby.types';
import type { WeatherCondition } from '../lobby/lobby.types';
import { CarSetupDto } from '../setup/dto/car-setup.dto';
import { TelemetryService } from '../telemetry/telemetry.service';
import { Track } from '../track/entities/track.entity';
import { TrackService } from '../track/track.service';
import { CalibrationService } from '../calibration/calibration.service';
import { F1DataService } from '../f1-data/f1-data.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { SessionsService } from '../sessions/sessions.service';
import { SimulationEngine, type TrackModel } from './engine/simulation.engine';
import type { MultiplayerSimulationResult } from './multiplayer.types';
import { SimulateSessionDto } from './dto/simulate-session.dto';
import { MULTIPLAYER_GRID_SIZE } from './engine-config.module';
import { SimulationRun } from './simulation-run.entity';
import type { RaceStrategy } from './strategy/race-strategy';
import type { SessionTelemetry } from '../telemetry/telemetry.types';
import {
  buildReferenceComparisons,
  listReferenceIdsForTrack,
  pickClosestReferenceMatch,
  TRACK_REFERENCE_METRICS,
} from '../track/track-reference-metrics';

function seedToNumber(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function averageSectorSplits(
  telemetry: SessionTelemetry,
): [number, number, number] | null {
  const rows = telemetry.sectorSplits;
  if (!rows.length) return null;
  const n = rows.length;
  const s1 = rows.reduce((a, x) => a + x.sector1, 0) / n;
  const s2 = rows.reduce((a, x) => a + x.sector2, 0) / n;
  const s3 = rows.reduce((a, x) => a + x.sector3, 0) / n;
  return [s1, s2, s3];
}

function averageTopSpeedStraight(telemetry: SessionTelemetry): number | null {
  const laps = telemetry.advancedLaps;
  if (!laps?.length) return null;
  const sum = laps.reduce((a, b) => a + b.topSpeedPerStraight, 0);
  return sum / laps.length;
}

function setupFingerprint(setup: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(setup))
    .digest('hex')
    .slice(0, 20);
}

@Injectable()
export class SimulationService {
  constructor(
    @Inject(MULTIPLAYER_GRID_SIZE)
    private readonly multiplayerGridSize: number,
    private readonly sessions: SessionsService,
    @InjectRepository(SimulationRun)
    private readonly runs: Repository<SimulationRun>,
    private readonly f1: F1DataService,
    private readonly leaderboard: LeaderboardService,
    private readonly tracks: TrackService,
    private readonly telemetry: TelemetryService,
    private readonly calibration: CalibrationService,
  ) {}

  async run(sessionId: string, body: SimulateSessionDto) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const session = await this.sessions.findOne(sessionId);
    if (!session.playerName?.trim()) {
      throw new UnprocessableEntityException(
        'Set playerName on the session (PATCH /api/v1/sessions/:id) before simulating.',
      );
    }

    const setupRaw = body.setup ?? session.carSetup;
    if (!setupRaw || typeof setupRaw !== 'object') {
      throw new UnprocessableEntityException(
        'Submit car setup via POST /api/v1/sessions/:id/setup or include setup in the simulate body.',
      );
    }

    const setup = plainToInstance(CarSetupDto, setupRaw);
    const setupErrors = await validate(setup);
    if (setupErrors.length) {
      throw new UnprocessableEntityException({
        message: 'Invalid car setup',
        errors: setupErrors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
      });
    }

    const track = await this.tracks.findBySlug(body.trackSlug);
    const model = this.tracks.toTrackModel(track);

    const seedStr = body.seed?.trim() || randomUUID();
    const seedNum = seedToNumber(seedStr);

    const cal = await this.calibration.getSectorCalibrationForTrack(
      body.trackSlug,
    );
    const engine = new SimulationEngine(
      setup,
      model,
      body.strategy as unknown as RaceStrategy,
      seedNum,
      sessionId,
      {
        gridSize: body.gridSize,
        ...(cal ? { calibration: { sectorScales: cal.sectorScales } } : {}),
      },
    );
    const out = engine.run();

    await this.telemetry.persist(sessionId, out.telemetry);

    const refIdsMerged = new Set<string>([
      ...(body.compareToReferenceIds ?? []),
      ...(body.compareAllReferences
        ? listReferenceIdsForTrack(body.trackSlug)
        : []),
    ]);
    const refIds = [...refIdsMerged];

    const knownRefIds = new Set(
      (TRACK_REFERENCE_METRICS[body.trackSlug] ?? []).map((r) => r.referenceId),
    );
    const unmatchedReferenceIds = refIds.filter((id) => !knownRefIds.has(id));

    const referenceComparisons = refIds.length
      ? buildReferenceComparisons(
          body.trackSlug,
          out.totalRaceTimeSeconds,
          out.bestLapSeconds,
          averageSectorSplits(out.telemetry),
          refIds,
          { playerTopSpeedStraightKph: averageTopSpeedStraight(out.telemetry) },
        )
      : undefined;

    const closestReferenceMatch = referenceComparisons?.length
      ? pickClosestReferenceMatch(referenceComparisons)
      : null;

    const exportSummary = {
      schemaVersion: 1 as const,
      seed: seedStr,
      trackSlug: body.trackSlug,
      setupFingerprint: setupFingerprint(setup as unknown as Record<string, unknown>),
      finalPosition: out.finalPosition,
      points: out.points,
      totalRaceTimeSeconds: out.totalRaceTimeSeconds,
      bestLapSeconds: out.bestLapSeconds,
      comparedReferenceIds: refIds,
    };

    const resultPayload = {
      engineVersion: 2,
      totalRaceTimeSeconds: out.totalRaceTimeSeconds,
      bestLapSeconds: out.bestLapSeconds,
      finalPosition: out.finalPosition,
      points: out.points,
      trackSlug: body.trackSlug,
      gridSize: out.gridSize,
      playerPosition: out.playerPosition,
      resultMode: out.resultMode,
      raceTopFinishers: out.raceTopFinishers,
      exportSummary,
      ...(referenceComparisons?.length ? { referenceComparisons } : {}),
      ...(closestReferenceMatch ? { closestReferenceMatch } : {}),
      ...(unmatchedReferenceIds.length ? { unmatchedReferenceIds } : {}),
    };

    const finalScore = Math.round(
      1_000_000 - out.totalRaceTimeSeconds * 10,
    );

    await this.runs.save(
      this.runs.create({
        sessionId,
        seed: seedStr,
        simVersion: 2,
        result: { ...resultPayload, telemetry: out.telemetry } as unknown as Record<
          string,
          unknown
        >,
      }),
    );

    await this.sessions.saveResult(
      sessionId,
      resultPayload as unknown as Record<string, unknown>,
      finalScore,
      session.budgetAllocation,
      seedStr,
      setup as unknown as Record<string, unknown>,
    );

    if (session.compareConstructorRef) {
      try {
        const summary = await this.f1.lookupConstructorSummary(
          session.seasonYear,
          session.compareConstructorRef,
        );
        if (summary) {
          (resultPayload as Record<string, unknown>).realWorld =
            summary;
        }
      } catch {
        /* optional */
      }
    }

    await this.leaderboard.submit(sessionId, session.playerName.trim(), finalScore, {
      opponentConstructorRef: session.opponentConstructorRef,
      opponentLabel: track.name,
      strategyMetrics: session.strategyMetrics,
      seasonYear: session.seasonYear,
      trackSlug: body.trackSlug,
      engineVersion: 2,
    });

    const sessionOut = await this.sessions.findOne(sessionId);
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      t0;

    return {
      result: { ...resultPayload, session: sessionOut, simWallTimeMs: elapsed },
      telemetry: out.telemetry,
    };
  }

  private applyWeatherToModel(
    model: TrackModel,
    weather: WeatherCondition,
  ): TrackModel {
    const c = { ...model.characteristics };
    if (weather === 'mixed') {
      c.tireDegradationMultiplier *= 1.35;
      c.overtakingDifficulty = Math.min(1, c.overtakingDifficulty + 0.2);
    } else if (weather === 'wet') {
      c.tireDegradationMultiplier *= 1.8;
      c.overtakingDifficulty = Math.min(1, c.overtakingDifficulty + 0.45);
      c.safetyCarProbability = Math.min(0.95, c.safetyCarProbability * 2.1);
    }
    return { ...model, characteristics: c };
  }

  /**
   * Head-to-head run: shared safety-car / traffic RNG (same seed + session-scoped car streams).
   */
  async runMultiplayer(payload: {
    trackEntity: Track;
    weather: WeatherCondition;
    seed: number;
    hostConfig: PlayerConfig;
    opponentConfig: PlayerConfig;
    hostTelemetrySessionId: string;
    opponentTelemetrySessionId: string;
  }): Promise<MultiplayerSimulationResult> {
    const base = this.tracks.toTrackModel(payload.trackEntity);
    const model = this.applyWeatherToModel(base, payload.weather);
    const seedNum = payload.seed >>> 0;

    const hostSetup = plainToInstance(CarSetupDto, payload.hostConfig.setup);
    const oppSetup = plainToInstance(CarSetupDto, payload.opponentConfig.setup);

    const cal = await this.calibration.getSectorCalibrationForTrack(
      payload.trackEntity.slug,
    );
    const calOpts = cal ? { calibration: { sectorScales: cal.sectorScales } } : {};
    const hostEngine = new SimulationEngine(
      hostSetup,
      model,
      payload.hostConfig.strategy,
      seedNum,
      payload.hostTelemetrySessionId,
      { gridSize: this.multiplayerGridSize, ...calOpts },
    );
    const oppEngine = new SimulationEngine(
      oppSetup,
      model,
      payload.opponentConfig.strategy,
      seedNum,
      payload.opponentTelemetrySessionId,
      { gridSize: this.multiplayerGridSize, ...calOpts },
    );

    const [hostResult, opponentResult] = await Promise.all([
      Promise.resolve(hostEngine.run()),
      Promise.resolve(oppEngine.run()),
    ]);

    const hostTime = hostResult.totalRaceTimeSeconds;
    const oppTime = opponentResult.totalRaceTimeSeconds;
    const gap = Math.abs(hostTime - oppTime);
    const eps = 1e-6;
    const winner =
      Math.abs(hostTime - oppTime) < eps
        ? null
        : hostTime < oppTime
          ? payload.hostConfig.userId
          : payload.opponentConfig.userId;

    return {
      winner,
      gapSeconds: parseFloat(gap.toFixed(3)),
      host: { userId: payload.hostConfig.userId, result: hostResult },
      opponent: { userId: payload.opponentConfig.userId, result: opponentResult },
      trackSlug: payload.trackEntity.slug,
      weather: payload.weather,
      seed: seedNum,
      simulatedAt: new Date().toISOString(),
    };
  }
}
