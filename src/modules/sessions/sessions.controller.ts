import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { listOpponentPresets } from '../../domain/simulation';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game session' })
  create(@Body() body: CreateSessionDto) {
    return this.sessions.create(body);
  }

  @Get('meta/opponents')
  @ApiOperation({ summary: 'Preset opponent teams (sim baseline budgets)' })
  opponentPresets() {
    return listOpponentPresets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  findOne(@Param('id') id: string) {
    return this.sessions.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update name, season, opponent preset, strategy sliders' })
  update(@Param('id') id: string, @Body() body: UpdateSessionDto) {
    return this.sessions.update(id, body);
  }
}
