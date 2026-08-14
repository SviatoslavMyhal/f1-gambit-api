import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session, SessionStatus } from './session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async create(dto: CreateSessionDto = {}): Promise<Session> {
    const session = this.repo.create({
      playerName: dto.playerName ?? null,
      seasonYear: dto.seasonYear ?? 2024,
      compareConstructorRef:
        dto.compareConstructorRef === undefined
          ? 'red_bull'
          : dto.compareConstructorRef || null,
      opponentConstructorRef: dto.opponentConstructorRef ?? 'red_bull',
      strategyMetrics: dto.strategyMetrics
        ? (dto.strategyMetrics as Record<string, number>)
        : null,
      status: SessionStatus.ALLOCATING,
    });
    return this.repo.save(session);
  }

  async update(id: string, dto: UpdateSessionDto): Promise<Session> {
    await this.findOne(id);
    const patch: Partial<Session> = {};
    if (dto.playerName !== undefined) {
      patch.playerName = dto.playerName?.trim() || null;
    }
    if (dto.seasonYear !== undefined) patch.seasonYear = dto.seasonYear;
    if (dto.compareConstructorRef !== undefined) {
      patch.compareConstructorRef = dto.compareConstructorRef || null;
    }
    if (dto.opponentConstructorRef !== undefined) {
      patch.opponentConstructorRef = dto.opponentConstructorRef || 'red_bull';
    }
    if (dto.strategyMetrics !== undefined) {
      patch.strategyMetrics = dto.strategyMetrics
        ? (dto.strategyMetrics as Record<string, number>)
        : null;
    }
    await this.repo.update(
      id,
      patch as Parameters<Repository<Session>['update']>[1],
    );
    return this.findOne(id);
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async updateStatus(id: string, status: SessionStatus): Promise<Session> {
    await this.repo.update(id, { status });
    return this.findOne(id);
  }

  async updateBudgetAllocation(
    id: string,
    allocation: Record<string, number>,
  ): Promise<Session> {
    await this.repo.update(id, {
      budgetAllocation: allocation,
      status: SessionStatus.SIMULATING,
    });
    return this.findOne(id);
  }

  async updateCarSetup(
    id: string,
    carSetup: Record<string, unknown>,
  ): Promise<Session> {
    await this.repo.update(id, {
      carSetup: carSetup as object,
      status: SessionStatus.SIMULATING,
    });
    return this.findOne(id);
  }

  async saveResult(
    id: string,
    result: Record<string, unknown>,
    score: number,
    allocation: Record<string, number> | null,
    lastSimulationSeed: string | null,
    carSetup?: Record<string, unknown> | null,
  ): Promise<Session> {
    const patch: Record<string, unknown> = {
      simulationResult: result,
      finalScore: score,
      status: SessionStatus.COMPLETED,
      lastSimulationSeed,
    };
    if (allocation !== null) patch.budgetAllocation = allocation;
    if (carSetup !== undefined) patch.carSetup = carSetup;
    await this.repo.update(
      id,
      patch as Parameters<Repository<Session>['update']>[1],
    );
    return this.findOne(id);
  }
}
