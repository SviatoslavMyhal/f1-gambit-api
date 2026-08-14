import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { AIService } from './ai.service';
import { AiAdviceDto } from './dto/ai-advice.dto';
import { AiConfigDto } from './dto/ai-config.dto';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly ai: AIService) {}

  @Post('config')
  @ApiOperation({ summary: 'Heuristic setup + strategy for track/weather' })
  config(@CurrentUser() user: User, @Body() dto: AiConfigDto) {
    return this.ai.generateForUser(user.id, dto);
  }

  @Post('advice')
  @ApiOperation({ summary: 'Compare current setup to balanced baseline' })
  advice(@Body() dto: AiAdviceDto) {
    return this.ai.getAdvice(dto.trackSlug, dto.weather, dto.currentSetup);
  }
}
