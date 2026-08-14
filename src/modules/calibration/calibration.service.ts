import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackService } from '../track/track.service';
import type { BaselineCalibrationJson } from './calibration.types';
import { TrackLapBaseline } from './entities/track-lap-baseline.entity';
import { OpenF1HttpClient } from './openf1-http.client';
import { aggregateOpenF1LapRows } from './openf1-laps.aggregate';
import { computeSectorScales } from './calibration-scale';
import { openF1SourceForTrackSlug } from './track-openf1-mapping';
import { referenceSimMedians } from './reference-sim';

export type SectorCalibration = {
  sectorScales: [number, number, number];
  baselineVersion: number;
};

@Injectable()
export class CalibrationService {
  private readonly log = new Logger(CalibrationService.name);

  constructor(
    @InjectRepository(TrackLapBaseline)
    private readonly repo: Repository<TrackLapBaseline>,
    private readonly config: ConfigService,
    private readonly openf1: OpenF1HttpClient,
    private readonly tracks: TrackService,
  ) {}

  calibrationEnabled(): boolean {
    return this.config.get<string>('CALIBRATION_ENABLED') === 'true';
  }

  private baselineTtlMs(): number {
    const days = parseInt(
      this.config.get<string>('CALIBRATION_BASELINE_TTL_DAYS') ?? '14',
      10,
    );
    return Math.max(1, days) * 86_400_000;
  }

  isStale(row: TrackLapBaseline): boolean {
    return Date.now() - row.fetchedAt.getTime() > this.baselineTtlMs();
  }

  /**
   * Hot path for simulation: read-only DB, no OpenF1. Returns undefined if disabled or no row.
   */
  async getSectorCalibrationForTrack(
    trackSlug: string,
  ): Promise<SectorCalibration | undefined> {
    if (!this.calibrationEnabled()) return undefined;
    const row = await this.repo.findOne({
      where: {
        trackSlug,
        sessionType: '',
        weatherBucket: '',
      },
    });
    if (!row) return undefined;
    const c = row.calibration;
    return {
      sectorScales: c.sectorScales,
      baselineVersion: row.baselineVersion,
    };
  }

  async getBaselineRow(trackSlug: string): Promise<TrackLapBaseline | null> {
    return this.repo.findOne({
      where: { trackSlug, sessionType: '', weatherBucket: '' },
    });
  }

  async getBaselineForApi(trackSlug: string): Promise<{
    baseline: TrackLapBaseline;
    stale: boolean;
  }> {
    await this.tracks.findBySlug(trackSlug);
    const row = await this.getBaselineRow(trackSlug);
    if (!row) {
      throw new NotFoundException(`No baseline stored for track ${trackSlug}`);
    }
    return { baseline: row, stale: this.isStale(row) };
  }

  assertRefreshAuthorized(secretHeader: string | undefined): void {
    const expected = this.config.get<string>('CALIBRATION_REFRESH_SECRET')?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'CALIBRATION_REFRESH_SECRET is not configured',
      );
    }
    if (!secretHeader || secretHeader !== expected) {
      throw new ForbiddenException('Invalid calibration refresh credentials');
    }
  }

  /**
   * Fetches OpenF1, aggregates laps, runs reference sim, upserts DB row.
   */
  async refreshBaselineForTrack(trackSlug: string): Promise<TrackLapBaseline> {
    await this.tracks.findBySlug(trackSlug);
    const src = openF1SourceForTrackSlug(trackSlug);
    if (!src) {
      throw new BadRequestException(
        `No OpenF1 mapping for track slug "${trackSlug}"`,
      );
    }

    const meetings = await this.openf1.meetingsForYear(src.year);
    const meeting = meetings.find((m) => m.meeting_name === src.meetingName);
    if (!meeting) {
      throw new BadRequestException(
        `OpenF1 meeting not found: ${src.meetingName} (${src.year})`,
      );
    }

    const sessions = await this.openf1.sessionsForMeeting(meeting.meeting_key);
    const session = sessions.find((s) => s.session_name === src.sessionName);
    if (!session) {
      throw new BadRequestException(
        `OpenF1 session "${src.sessionName}" not found for meeting ${meeting.meeting_key}`,
      );
    }

    const lapRows = await this.openf1.lapsForSession(session.session_key);
    const aggregates = aggregateOpenF1LapRows(lapRows, {
      meetingName: meeting.meeting_name,
      circuitShortName: meeting.circuit_short_name,
      year: src.year,
    });
    if (!aggregates) {
      throw new BadRequestException(
        'OpenF1 lap data produced no valid samples for aggregation',
      );
    }

    const trackEntity = await this.tracks.findBySlug(trackSlug);
    const model = this.tracks.toTrackModel(trackEntity);
    const simMed = referenceSimMedians(model);

    const openf1MedianLap = aggregates.lapSeconds.median;
    const openf1MedianSectors: [number, number, number] = [
      aggregates.sector1Seconds.median,
      aggregates.sector2Seconds.median,
      aggregates.sector3Seconds.median,
    ];
    const sectorScales = computeSectorScales(
      openf1MedianLap,
      openf1MedianSectors,
      simMed.medianLap,
      simMed.medianSectors,
    );

    const calibration: BaselineCalibrationJson = {
      sectorScales,
      referenceSimMedianLap: simMed.medianLap,
      referenceSimMedianSectors: simMed.medianSectors,
      openf1MedianLap,
      openf1MedianSectors,
      computedAt: new Date().toISOString(),
    };

    const row: Omit<TrackLapBaseline, 'id'> = {
      trackSlug,
      sessionType: '',
      weatherBucket: '',
      source: 'openf1',
      fetchedAt: new Date(),
      baselineVersion: 1,
      openf1MeetingKey: meeting.meeting_key,
      openf1SessionKey: session.session_key,
      aggregates,
      calibration,
    };

    await this.repo.upsert(row, {
      conflictPaths: ['trackSlug', 'sessionType', 'weatherBucket'],
    });

    const saved = await this.getBaselineRow(trackSlug);
    if (!saved) {
      throw new Error('Upsert failed to persist baseline');
    }
    this.log.log(
      `Calibration refreshed for ${trackSlug} scales=[${sectorScales.join(',')}]`,
    );
    return saved;
  }
}
