import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Token for head-to-head grid size (SimulationEngine gridSize), configurable via env.
 * Demonstrates Nest dynamic module + custom provider (useFactory + inject ConfigService).
 */
export const MULTIPLAYER_GRID_SIZE = 'MULTIPLAYER_GRID_SIZE';

function clampGridSize(raw: number): number {
  if (!Number.isFinite(raw)) return 20;
  return Math.max(2, Math.min(22, Math.floor(raw)));
}

@Module({})
export class EngineConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: EngineConfigModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: MULTIPLAYER_GRID_SIZE,
          useFactory: (cfg: ConfigService) =>
            clampGridSize(
              parseInt(cfg.get<string>('MULTIPLAYER_GRID_SIZE', '20'), 10),
            ),
          inject: [ConfigService],
        },
      ],
      exports: [MULTIPLAYER_GRID_SIZE],
    };
  }
}
