import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { BettingService } from './betting.service';
import { PlaceBetDto } from './dto/place-bet.dto';

@ApiTags('betting')
@Controller('lobby/:lobbyId/bets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BettingController {
  constructor(private readonly betting: BettingService) {}

  @Post()
  @ApiOperation({ summary: 'Place a bet on the outcome of a lobby battle' })
  placeBet(
    @CurrentUser() user: User,
    @Param('lobbyId', ParseUUIDPipe) lobbyId: string,
    @Body() dto: PlaceBetDto,
  ) {
    return this.betting.placeBet(user, lobbyId, dto.predictedWinnerUserId, dto.stake);
  }
}
