import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimulateSessionDto } from './dto/simulate-session.dto';
import { SimulationService } from './simulation.service';

@ApiTags('simulation')
@Controller('sessions')
export class SimulationController {
  constructor(private readonly simulation: SimulationService) {}

  @Post(':id/simulate')
  @ApiOperation({
    summary:
      'Run race simulation (engine v2 — deterministic, telemetry-grade output)',
  })
  simulate(@Param('id') id: string, @Body() body: SimulateSessionDto) {
    return this.simulation.run(id, body);
  }
}
