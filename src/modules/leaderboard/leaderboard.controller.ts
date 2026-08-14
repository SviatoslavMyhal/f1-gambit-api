import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly users: UsersService,
  ) {}

  @Get('ratings')
  @ApiOperation({ summary: 'Top players by ELO rating' })
  ratings(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.users.topByRating(Number.isFinite(n) ? n : 50);
  }

  @Get()
  @ApiOperation({ summary: 'Top scores' })
  top(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 20;
    return this.leaderboard.top(Number.isFinite(n) ? n : 20);
  }

  @Post()
  @ApiOperation({ summary: 'Submit score' })
  submit(@Body() dto: SubmitScoreDto) {
    return this.leaderboard.submit(
      dto.sessionId,
      dto.playerName,
      dto.score,
      dto.meta,
    );
  }
}
