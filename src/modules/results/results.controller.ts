import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResultsService } from './results.service';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get(':sessionId')
  @ApiOperation({ summary: 'Latest simulation run for a session (full payload + seed)' })
  latest(@Param('sessionId') sessionId: string) {
    return this.results.latestForSession(sessionId);
  }
}
