import { Module } from '@nestjs/common';
import { OpenF1Controller } from './openf1.controller';
import { OpenF1Service } from './openf1.service';

@Module({
  controllers: [OpenF1Controller],
  providers: [OpenF1Service],
  exports: [OpenF1Service],
})
export class OpenF1Module {}
