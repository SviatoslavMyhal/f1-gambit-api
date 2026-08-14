import { ConfigService } from '@nestjs/config';
import type { QueueOptions } from 'bullmq';

export function createBullRootOptions(config: ConfigService): QueueOptions {
  return {
    connection: {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
      // Required by BullMQ: it issues blocking commands that must not be cut short by ioredis's own retry limit.
      maxRetriesPerRequest: null,
    },
  };
}
