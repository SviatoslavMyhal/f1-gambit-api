import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { F1ApiCache } from './f1-api-cache.entity';
import { F1DataAggregatedController } from './f1-data-aggregated.controller';
import { F1DataController } from './f1-data.controller';
import { F1DataService } from './f1-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([F1ApiCache])],
  controllers: [F1DataController, F1DataAggregatedController],
  providers: [F1DataService],
  exports: [F1DataService],
})
export class F1DataModule {}
