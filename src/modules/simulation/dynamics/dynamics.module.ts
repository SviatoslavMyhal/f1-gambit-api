import { Module } from '@nestjs/common';
import { CarDynamicsService } from './car-dynamics.service';
import { TireModelService } from './tire-model.service';

@Module({
  providers: [CarDynamicsService, TireModelService],
  exports: [CarDynamicsService, TireModelService],
})
export class DynamicsModule {}
