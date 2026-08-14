import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalibrationService } from './calibration.service';

@ApiTags('calibration')
@Controller('calibration')
export class CalibrationController {
  constructor(private readonly calibration: CalibrationService) {}

  @Get('baselines/:trackSlug')
  @ApiOperation({
    summary: 'Debug: stored OpenF1 lap baseline + calibration for a track',
    description:
      'Returns aggregates and sector scales. `stale` is true when older than CALIBRATION_BASELINE_TTL_DAYS.',
  })
  async getBaseline(@Param('trackSlug') trackSlug: string) {
    const { baseline, stale } = await this.calibration.getBaselineForApi(
      trackSlug,
    );
    return {
      trackSlug: baseline.trackSlug,
      stale,
      fetchedAt: baseline.fetchedAt,
      baselineVersion: baseline.baselineVersion,
      openf1MeetingKey: baseline.openf1MeetingKey,
      openf1SessionKey: baseline.openf1SessionKey,
      aggregates: baseline.aggregates,
      calibration: baseline.calibration,
    };
  }

  @Post('baselines/:trackSlug/refresh')
  @ApiOperation({
    summary: 'Re-fetch OpenF1 laps and recompute calibration (protected)',
  })
  @ApiHeader({
    name: 'x-calibration-secret',
    required: true,
    description: 'Must match env CALIBRATION_REFRESH_SECRET',
  })
  async refreshBaseline(
    @Param('trackSlug') trackSlug: string,
    @Headers('x-calibration-secret') secret: string | undefined,
  ) {
    this.calibration.assertRefreshAuthorized(secret);
    const baseline = await this.calibration.refreshBaselineForTrack(trackSlug);
    return {
      trackSlug: baseline.trackSlug,
      fetchedAt: baseline.fetchedAt,
      openf1SessionKey: baseline.openf1SessionKey,
      calibration: baseline.calibration,
    };
  }
}
