import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrackModule } from '../track/track.module';
import { AiController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  imports: [TrackModule, AuthModule],
  controllers: [AiController],
  providers: [AIService],
  exports: [AIService],
})
export class AiModule {}
