import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Lobby } from '../lobby/entities/lobby.entity';
import { TelemetrySnapshot } from './entities/telemetry-snapshot.entity';
import type {
  DegradationCurvePoint,
  LapDeltaPoint,
  RaceEventTelemetry,
  SectorPerformanceSummary,
  SessionTelemetry,
  SpeedTracePoint,
} from './telemetry.types';
import type {
  MultiplayerSimulationResult,
  MultiplayerTelemetryPayload,
} from '../simulation/multiplayer.types';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetrySnapshot)
    private readonly repo: Repository<TelemetrySnapshot>,
    @InjectRepository(Lobby)
    private readonly lobbies: Repository<Lobby>,
  ) {}

  async persist(
    sessionId: string,
    telemetry: SessionTelemetry,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager?.getRepository(TelemetrySnapshot) ?? this.repo;
    const existing = await repo.findOne({ where: { sessionId } });
    if (existing) {
      existing.data = telemetry;
      await repo.save(existing);
    } else {
      await repo.save(repo.create({ sessionId, data: telemetry }));
    }
  }

  async findBySession(sessionId: string): Promise<SessionTelemetry> {
    const snap = await this.repo.findOne({ where: { sessionId } });
    if (!snap) {
      throw new NotFoundException(`No telemetry for session ${sessionId}`);
    }
    return snap.data;
  }

  async getDegradationCurve(sessionId: string): Promise<DegradationCurvePoint[]> {
    const t = await this.findBySession(sessionId);
    return t.tireData.map((lap) => ({
      lap: lap.lap,
      wear: lap.wearPercent,
      grip: lap.gripLevel,
      compound: lap.compound,
      cliff: lap.wearPercent > 85,
    }));
  }

  async getLapDeltaChart(sessionId: string): Promise<LapDeltaPoint[]> {
    const t = await this.findBySession(sessionId);
    const bestLap = Math.min(...t.lapTimes.map((l) => l.timeSeconds));
    return t.lapTimes.map((l) => ({
      lap: l.lap,
      delta: l.timeSeconds - bestLap,
      compound: l.compound,
      event:
        t.events.find((e) => e.lap === l.lap)?.type ??
        null,
    }));
  }

  async getSectorPerformance(
    sessionId: string,
  ): Promise<SectorPerformanceSummary> {
    const t = await this.findBySession(sessionId);
    const s1 = t.sectorSplits.map((x) => x.sector1);
    const s2 = t.sectorSplits.map((x) => x.sector2);
    const s3 = t.sectorSplits.map((x) => x.sector3);
    const stat = (arr: number[]) => ({
      best: Math.min(...arr),
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
      worst: Math.max(...arr),
    });
    return {
      sector1: stat(s1),
      sector2: stat(s2),
      sector3: stat(s3),
    };
  }

  async getSpeedTrace(sessionId: string): Promise<SpeedTracePoint[]> {
    const t = await this.findBySession(sessionId);
    return t.speedTrace.map((s) => ({
      corner: s.corner,
      entry: s.entrySpeedKph,
      mid: s.midCornerSpeedKph,
      exit: s.exitSpeedKph,
    }));
  }

  async getEvents(sessionId: string): Promise<RaceEventTelemetry[]> {
    const t = await this.findBySession(sessionId);
    return t.events;
  }

  async persistMultiplayer(
    lobbyId: string,
    result: MultiplayerSimulationResult,
    manager?: EntityManager,
  ): Promise<void> {
    await Promise.all([
      this.persist(`${lobbyId}:host`, result.host.result.telemetry, manager),
      this.persist(`${lobbyId}:opponent`, result.opponent.result.telemetry, manager),
    ]);
  }

  async getMultiplayerTelemetry(
    lobbyId: string,
    userId: string,
  ): Promise<MultiplayerTelemetryPayload> {
    const lobby = await this.lobbies.findOne({ where: { id: lobbyId } });
    if (!lobby) throw new NotFoundException(`Lobby ${lobbyId} not found`);
    if (lobby.hostUserId !== userId && lobby.opponentUserId !== userId) {
      throw new ForbiddenException('You are not a member of this lobby');
    }

    const [host, opponent] = await Promise.all([
      this.findBySession(`${lobbyId}:host`),
      this.findBySession(`${lobbyId}:opponent`),
    ]);

    return {
      host,
      opponent,
      lapDeltaComparison: this.buildLapComparison(host, opponent),
      tireWearComparison: this.buildTireComparison(host, opponent),
      sectorDeltaComparison: this.buildSectorComparison(host, opponent),
    };
  }

  /** Positive delta ⇒ host faster on that lap (lower time). */
  private buildLapComparison(host: SessionTelemetry, opponent: SessionTelemetry) {
    const n = Math.max(host.lapTimes.length, opponent.lapTimes.length);
    const rows: MultiplayerTelemetryPayload['lapDeltaComparison'] = [];
    for (let i = 0; i < n; i++) {
      const h = host.lapTimes[i];
      const o = opponent.lapTimes[i];
      const hostTime = h?.timeSeconds ?? null;
      const opponentTime = o?.timeSeconds ?? null;
      const delta =
        hostTime != null && opponentTime != null
          ? parseFloat((opponentTime - hostTime).toFixed(3))
          : 0;
      rows.push({
        lap: h?.lap ?? o?.lap ?? i + 1,
        hostTime,
        opponentTime,
        delta,
      });
    }
    return rows;
  }

  private buildTireComparison(host: SessionTelemetry, opponent: SessionTelemetry) {
    const n = Math.max(host.tireData.length, opponent.tireData.length);
    const rows: MultiplayerTelemetryPayload['tireWearComparison'] = [];
    for (let i = 0; i < n; i++) {
      const h = host.tireData[i];
      const o = opponent.tireData[i];
      rows.push({
        lap: h?.lap ?? o?.lap ?? i + 1,
        hostWear: h?.wearPercent ?? null,
        opponentWear: o?.wearPercent ?? null,
      });
    }
    return rows;
  }

  private buildSectorComparison(host: SessionTelemetry, opponent: SessionTelemetry) {
    const n = Math.max(host.sectorSplits.length, opponent.sectorSplits.length);
    const rows: MultiplayerTelemetryPayload['sectorDeltaComparison'] = [];
    for (let i = 0; i < n; i++) {
      const h = host.sectorSplits[i];
      const o = opponent.sectorSplits[i];
      rows.push({
        lap: h?.lap ?? o?.lap ?? i + 1,
        hostS1: h?.sector1 ?? 0,
        hostS2: h?.sector2 ?? 0,
        hostS3: h?.sector3 ?? 0,
        opponentS1: o?.sector1 ?? null,
        opponentS2: o?.sector2 ?? null,
        opponentS3: o?.sector3 ?? null,
      });
    }
    return rows;
  }
}
