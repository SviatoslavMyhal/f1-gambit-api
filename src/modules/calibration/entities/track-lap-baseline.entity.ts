import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type {
  BaselineAggregatesJson,
  BaselineCalibrationJson,
} from '../calibration.types';

@Entity('track_lap_baselines')
@Unique('UQ_track_lap_baselines_slug_ctx', [
  'trackSlug',
  'sessionType',
  'weatherBucket',
])
export class TrackLapBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  trackSlug: string;

  @Column({ type: 'varchar', length: 32, default: '' })
  sessionType: string;

  @Column({ type: 'varchar', length: 32, default: '' })
  weatherBucket: string;

  @Column({ type: 'varchar', length: 32, default: 'openf1' })
  source: string;

  @Column({ type: 'timestamptz' })
  fetchedAt: Date;

  @Column({ type: 'int', default: 1 })
  baselineVersion: number;

  @Column({ type: 'int', nullable: true })
  openf1MeetingKey: number | null;

  @Column({ type: 'int', nullable: true })
  openf1SessionKey: number | null;

  @Column({ type: 'jsonb' })
  aggregates: BaselineAggregatesJson;

  @Column({ type: 'jsonb' })
  calibration: BaselineCalibrationJson;
}
