import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimulationRun } from '../simulation/simulation-run.entity';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(SimulationRun)
    private readonly runs: Repository<SimulationRun>,
  ) {}

  async latestForSession(sessionId: string): Promise<SimulationRun> {
    const row = await this.runs.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
    if (!row) {
      throw new NotFoundException(`No simulation results for session ${sessionId}`);
    }
    return row;
  }
}
