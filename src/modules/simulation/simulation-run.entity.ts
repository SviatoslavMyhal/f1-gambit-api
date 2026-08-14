import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Session } from '../sessions/session.entity';

@Entity('simulation_runs')
@Index(['sessionId', 'createdAt'])
export class SimulationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column({ type: 'varchar', length: 128 })
  seed: string;

  @Column({ type: 'smallint' })
  simVersion: number;

  @Column({ type: 'jsonb' })
  result: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
