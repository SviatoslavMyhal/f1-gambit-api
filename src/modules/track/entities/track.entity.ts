import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TrackSector = {
  sector: 1 | 2 | 3;
  type: 'technical' | 'highspeed' | 'mixed';
  lengthKm: number;
  baseTime: number;
};

export type CornerData = {
  number: number;
  name?: string;
  type: 'hairpin' | 'medium' | 'fast' | 'chicane';
  speedKph: number;
  lateralG: number;
  brakingZoneM: number;
  tireThermalLoad: number;
};

export type TrackCharacteristics = {
  aeroSensitivity: number;
  mechanicalGripWeight: number;
  tireDegradationMultiplier: number;
  overtakingDifficulty: number;
  safetyCarProbability: number;
};

@Entity('tracks')
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'varchar', length: 128 })
  country: string;

  @Column({ type: 'float', name: 'lengthKm' })
  lengthKm: number;

  @Column({ type: 'int' })
  laps: number;

  @Column({ type: 'int' })
  corners: number;

  @Column({ type: 'float', name: 'averageSpeedKph' })
  averageSpeedKph: number;

  @Column({ type: 'float', name: 'trackTemperatureC' })
  trackTemperatureC: number;

  @Column({ type: 'jsonb' })
  sectors: TrackSector[];

  @Column({ type: 'jsonb', name: 'corners_data' })
  corners_data: CornerData[];

  @Column({ type: 'jsonb' })
  characteristics: TrackCharacteristics;
}
