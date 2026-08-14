import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimulationRun } from '../simulation/simulation-run.entity';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [TypeOrmModule.forFeature([SimulationRun])],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
