import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { SessionTelemetry } from '../telemetry.types';

@Entity('telemetry_snapshots')
export class TelemetrySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Session UUID for solo runs, or `{lobbyId}:host` / `{lobbyId}:opponent` for multiplayer. */
  @Column({ type: 'varchar', length: 128, unique: true })
  sessionId: string;

  @Column({ type: 'jsonb' })
  data: SessionTelemetry;

  @CreateDateColumn()
  createdAt: Date;
}
