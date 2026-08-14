import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StrategyService } from '../simulation/strategy/strategy.service';
import { TrackService } from './track.service';

@ApiTags('tracks')
@Controller('tracks')
export class TrackController {
  constructor(
    private readonly tracks: TrackService,
    private readonly strategy: StrategyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'All circuits' })
  list() {
    return this.tracks.findAll();
  }

  @Get(':slug/references')
  @ApiOperation({
    summary:
      'Reference metrics (quali_push, race_manage) for optional compareToReferenceIds on simulate',
  })
  references(@Param('slug') slug: string) {
    return this.tracks.referencesForSlug(slug);
  }

  @Get(':slug/strategies')
  @ApiOperation({ summary: 'Recommended strategy variants for track' })
  strategies(@Param('slug') slug: string) {
    return this.strategy.generateStrategiesForSlug(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Track by slug' })
  one(@Param('slug') slug: string) {
    return this.tracks.findBySlug(slug);
  }
}
