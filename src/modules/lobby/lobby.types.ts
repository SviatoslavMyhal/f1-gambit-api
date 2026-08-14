import type { CarSetupDto } from '../setup/dto/car-setup.dto';
import type { RaceStrategy } from '../simulation/strategy/race-strategy';

export enum LobbyStatus {
  WAITING = 'waiting',
  CONFIGURING = 'configuring',
  READY = 'ready',
  SIMULATING = 'simulating',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum WeatherCondition {
  DRY = 'dry',
  MIXED = 'mixed',
  WET = 'wet',
}

export interface PlayerConfig {
  userId: string;
  setup: CarSetupDto;
  strategy: RaceStrategy;
  submittedAt: string;
}
