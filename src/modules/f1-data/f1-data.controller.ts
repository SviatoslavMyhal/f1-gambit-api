import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { F1DataService } from './f1-data.service';

@ApiTags('f1')
@Controller('f1')
export class F1DataController {
  constructor(private readonly f1: F1DataService) {}

  @Get('seasons/:year/constructors')
  @ApiOperation({ summary: 'Constructor standings (cached proxy to Ergast-compatible API)' })
  constructorStandings(@Param('year', ParseIntPipe) year: number) {
    return this.f1.getConstructorStandings(year);
  }

  @Get('seasons/:year/drivers')
  @ApiOperation({ summary: 'Driver list for season (cached)' })
  drivers(@Param('year', ParseIntPipe) year: number) {
    return this.f1.fetchDrivers(year);
  }

  @Get('seasons/:year/driver-standings')
  @ApiOperation({
    summary:
      'Real F1 driver championship standings (points, wins) — Ergast-compatible',
  })
  driverStandings(@Param('year', ParseIntPipe) year: number) {
    return this.f1.fetchDriverStandings(year);
  }

  @Get('seasons/:year/schedule')
  @ApiOperation({ summary: 'Season calendar (fetchSeason — cached)' })
  schedule(@Param('year', ParseIntPipe) year: number) {
    return this.f1.fetchSeason(year);
  }

  @Get('seasons/:year/teams')
  @ApiOperation({ summary: 'Constructor standings as normalized teams (cached)' })
  teams(@Param('year', ParseIntPipe) year: number) {
    return this.f1.fetchTeams(year);
  }
}
