import { ConfigService } from '@nestjs/config';
import type { QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

export function createBullRootOptions(config: ConfigService): QueueOptions {
  // Required by BullMQ: it issues blocking commands that must not be cut short by ioredis's own retry limit.
  const maxRetriesPerRequest = null;

  const url = config.get<string>('REDIS_URL');
  const connection = url
    ? new IORedis(url, { maxRetriesPerRequest })
    : new IORedis({
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
        maxRetriesPerRequest,
      });

  return { connection };
}
