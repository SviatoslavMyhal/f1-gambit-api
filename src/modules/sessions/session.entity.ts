import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SessionStatus {
  ALLOCATING = 'allocating',
  SIMULATING = 'simulating',
  COMPLETED = 'completed',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  playerName: string | null;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ALLOCATING,
  })
  status: SessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  budgetAllocation: Record<string, number> | null;

  /** Race engineer car setup (replaces budget-only flow when set). */
  @Column({ type: 'jsonb', nullable: true })
  carSetup: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  simulationResult: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  finalScore: number | null;

  /** Calendar year used for F1 reference data + copy (default 2024). */
  @Column({ type: 'int', default: 2024 })
  seasonYear: number;

  /** Ergast-style constructor ref, e.g. `red_bull`, for comparison copy + enrichment. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  compareConstructorRef: string | null;

  /** Sim opponent baseline (preset key), e.g. `ferrari`, `mercedes`. */
  @Column({ type: 'varchar', length: 64, default: 'red_bull' })
  opponentConstructorRef: string;

  /** Optional sliders: pitAggression, paceFocus, consistency (0–1). */
  @Column({ type: 'jsonb', nullable: true })
  strategyMetrics: Record<string, number> | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  lastSimulationSeed: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
