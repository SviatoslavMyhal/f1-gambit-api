import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { F1DataService } from './f1-data.service';

@ApiTags('f1-data')
@Controller('f1-data')
export class F1DataAggregatedController {
  constructor(private readonly f1: F1DataService) {}

  @Get('standings/drivers')
  @ApiOperation({ summary: 'Driver standings (cached Ergast/Jolpica)' })
  driverStandings(@Query('season', ParseIntPipe) season: number) {
    return this.f1.getDriverStandings(season);
  }

  @Get('standings/constructors')
  @ApiOperation({ summary: 'Constructor standings (cached)' })
  constructorStandings(@Query('season', ParseIntPipe) season: number) {
    return this.f1.getConstructorStandings(season);
  }

  @Get('race-results')
  @ApiOperation({ summary: 'Race results for round (cached)' })
  raceResults(
    @Query('season', ParseIntPipe) season: number,
    @Query('round', ParseIntPipe) round: number,
  ) {
    return this.f1.getRaceResults(season, round);
  }

  @Get('circuits')
  @ApiOperation({ summary: 'Circuits list (cached)' })
  circuits() {
    return this.f1.getCircuits();
  }
}
