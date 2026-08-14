import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { User } from '../users/entities/user.entity';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Get('multiplayer/:lobbyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dual telemetry + comparison for a finished lobby' })
  multiplayer(
    @CurrentUser() user: User,
    @Param('lobbyId', ParseUUIDPipe) lobbyId: string,
  ) {
    return this.telemetry.getMultiplayerTelemetry(lobbyId, user.id);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Full telemetry snapshot' })
  full(@Param('sessionId') sessionId: string) {
    return this.telemetry.findBySession(sessionId);
  }

  @Get(':sessionId/degradation-curve')
  @ApiOperation({ summary: 'Tire degradation — Recharts LineChart' })
  degradation(@Param('sessionId') sessionId: string) {
    return this.telemetry.getDegradationCurve(sessionId);
  }

  @Get(':sessionId/lap-delta')
  @ApiOperation({ summary: 'Lap delta vs best — BarChart' })
  lapDelta(@Param('sessionId') sessionId: string) {
    return this.telemetry.getLapDeltaChart(sessionId);
  }

  @Get(':sessionId/sector-performance')
  @ApiOperation({ summary: 'Sector stats — RadarChart' })
  sectors(@Param('sessionId') sessionId: string) {
    return this.telemetry.getSectorPerformance(sessionId);
  }

  @Get(':sessionId/speed-trace')
  @ApiOperation({ summary: 'Corner speeds — AreaChart' })
  speed(@Param('sessionId') sessionId: string) {
    return this.telemetry.getSpeedTrace(sessionId);
  }

  @Get(':sessionId/events')
  @ApiOperation({ summary: 'Race timeline events' })
  events(@Param('sessionId') sessionId: string) {
    return this.telemetry.getEvents(sessionId);
  }
}
