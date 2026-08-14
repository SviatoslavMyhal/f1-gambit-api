import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lobby } from '../../lobby/entities/lobby.entity';
import { User } from '../../users/entities/user.entity';
import { BetStatus } from '../betting.types';

@Entity('bets')
@Index(['lobbyId', 'status'])
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  lobbyId: string;

  @ManyToOne(() => Lobby, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lobbyId' })
  lobby: Lobby;

  @Column({ type: 'uuid' })
  bettorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bettorUserId' })
  bettor: User;

  @Column({ type: 'uuid' })
  predictedWinnerUserId: string;

  @Column({ type: 'int' })
  stake: number;

  @Column({ type: 'enum', enum: BetStatus, default: BetStatus.PENDING })
  status: BetStatus;

  @Column({ type: 'int', nullable: true })
  payout: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
