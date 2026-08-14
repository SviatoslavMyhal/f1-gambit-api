import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Track } from '../../track/entities/track.entity';
import { User } from '../../users/entities/user.entity';
import { LobbyStatus, WeatherCondition, type PlayerConfig } from '../lobby.types';

@Entity('lobbies')
export class Lobby {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 6, unique: true })
  inviteCode: string;

  @Column('uuid')
  hostUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostUserId' })
  host: User;

  @Column('uuid', { nullable: true })
  opponentUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'opponentUserId' })
  opponent: User | null;

  @Column({ type: 'enum', enum: LobbyStatus, default: LobbyStatus.WAITING })
  status: LobbyStatus;

  @Column({ type: 'int', default: 5 })
  configTimeLimitMinutes: number;

  @Column({ type: 'timestamptz', nullable: true })
  configDeadline: Date | null;

  @Column('uuid')
  trackId: string;

  @ManyToOne(() => Track, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column({ type: 'enum', enum: WeatherCondition })
  weather: WeatherCondition;

  @Column({ type: 'int' })
  simulationSeed: number;

  @Column({ default: false })
  hostReady: boolean;

  @Column({ default: false })
  opponentReady: boolean;

  @Column({ type: 'jsonb', nullable: true })
  hostConfig: PlayerConfig | null;

  @Column({ type: 'jsonb', nullable: true })
  opponentConfig: PlayerConfig | null;

  @Column('uuid', { nullable: true })
  winnerUserId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  simulationResult: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
