import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('leaderboard_entries')
@Index(['constructorPoints', 'createdAt'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  sessionId: string;

  @Column({ type: 'varchar', length: 128 })
  playerName: string;

  /** Total constructor-style points for the mini-season simulation. */
  @Column({ type: 'int' })
  constructorPoints: number;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
