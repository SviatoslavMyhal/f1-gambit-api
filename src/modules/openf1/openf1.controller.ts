import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OpenF1Service } from './openf1.service';

@ApiTags('openf1')
@Controller('openf1')
export class OpenF1Controller {
  constructor(private readonly openf1: OpenF1Service) {}

  @Get('*')
  @ApiOperation({
    summary: 'Proxy to OpenF1 v1 (meetings, sessions, drivers, laps, …)',
    description:
      'Example: GET /api/v1/openf1/meetings?year=2024 — forwards query string to api.openf1.org',
  })
  proxy(@Req() req: Request) {
    return this.openf1.proxy(req);
  }
}
