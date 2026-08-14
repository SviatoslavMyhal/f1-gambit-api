import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';
import { LobbySummaryExportResponseDto } from './dto/lobby-summary-export-response.dto';
import { SubmitConfigDto } from './dto/submit-config.dto';
import { LobbyService } from './lobby.service';

@ApiTags('lobby')
@Controller('lobby')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LobbyController {
  constructor(private readonly lobby: LobbyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new battle lobby' })
  create(@CurrentUser() user: User, @Body() dto: CreateLobbyDto) {
    return this.lobby.create(user, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join lobby by invite code' })
  join(@CurrentUser() user: User, @Body() dto: JoinLobbyDto) {
    return this.lobby.join(dto.inviteCode, user);
  }

  @Post(':id/config')
  @ApiOperation({ summary: 'Submit car setup + strategy for the config phase' })
  submitConfig(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitConfigDto,
  ) {
    return this.lobby.submitConfig(id, user, dto.setup, dto.strategy);
  }

  @Get(':id/summary-export')
  @ApiOperation({
    summary: 'Finished lobby: plain-text + JSON for clipboard export',
  })
  @ApiOkResponse({ type: LobbySummaryExportResponseDto })
  getSummaryExport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.lobby.getSummaryExport(id, user);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Full results for a finished lobby' })
  getResults(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.lobby.getResults(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lobby state (poll ~3s); triggers auto-start' })
  getLobby(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.lobby.getLobbyState(id, user);
  }
}
