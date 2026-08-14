import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Hooks Nest lifecycle: use for warm-up logging; extend with caches or probes as needed.
 */
@Injectable()
export class AppBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const env = this.config.get<string>('NODE_ENV', 'development');
    this.logger.log(`Application module initialized (NODE_ENV=${env})`);
  }
}
