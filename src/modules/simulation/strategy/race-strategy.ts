import type { TireCompound } from '../../setup/dto/tire-compound';

export interface StintPlan {
  stint: number;
  compound: TireCompound;
  startLap: number;
  targetEndLap: number;
  pushMode: 'PUSH' | 'MANAGE' | 'SAVE';
}

export interface PitWindow {
  stint: number;
  earliest: number;
  latest: number;
  optimal: number;
  undercut: boolean;
  overcut: boolean;
}

export interface RaceStrategy {
  stints: StintPlan[];
  pitWindows: PitWindow[];
  targetLapTime: number;
  underFuelThreshold: number;
}
