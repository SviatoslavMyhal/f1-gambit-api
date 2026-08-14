import { CarSetupDto } from '../setup/dto/car-setup.dto';
import { TireCompound } from '../setup/dto/tire-compound';
import { SimulationEngine } from '../simulation/engine/simulation.engine';
import type { TrackModel } from '../simulation/engine/simulation.engine';
import type { RaceStrategy } from '../simulation/strategy/race-strategy';
import { percentile } from './openf1-laps.aggregate';

/** Fixed seed so reference medians are stable for a given track model. */
export const REFERENCE_CALIBRATION_SEED = 0xc41b09;

export function referenceSetup(): CarSetupDto {
  return {
    frontWing: 6,
    rearWing: 6,
    suspensionStiffness: 5,
    brakeBias: 58,
    rideHeight: 5,
    differentialOnThrottle: 75,
    startingCompound: TireCompound.MEDIUM,
    fuelLoad: 2,
  };
}

export function referenceStrategy(totalLaps: number): RaceStrategy {
  const pit = Math.max(10, Math.floor(totalLaps * 0.4));
  return {
    stints: [
      {
        stint: 0,
        compound: TireCompound.MEDIUM,
        startLap: 1,
        targetEndLap: pit,
        pushMode: 'PUSH',
      },
      {
        stint: 1,
        compound: TireCompound.HARD,
        startLap: pit + 1,
        targetEndLap: totalLaps,
        pushMode: 'MANAGE',
      },
    ],
    pitWindows: [
      {
        stint: 0,
        earliest: pit - 2,
        latest: pit + 4,
        optimal: pit,
        undercut: false,
        overcut: false,
      },
    ],
    targetLapTime: 90,
    underFuelThreshold: 3,
  };
}

export type ReferenceSimMedians = {
  medianLap: number;
  medianSectors: [number, number, number];
};

/**
 * One dry-model reference run; medians use laps >= 2 to mirror OpenF1 filtering.
 */
export function referenceSimMedians(track: TrackModel): ReferenceSimMedians {
  const engine = new SimulationEngine(
    referenceSetup(),
    track,
    referenceStrategy(track.laps),
    REFERENCE_CALIBRATION_SEED,
    'calibration:reference',
    { gridSize: 20 },
  );
  const result = engine.run();
  const lapTimes = result.telemetry.lapTimes.filter((x) => x.lap >= 2);
  const sectors = result.telemetry.sectorSplits.filter((x) => x.lap >= 2);
  const laps = lapTimes.map((x) => x.timeSeconds).sort((a, b) => a - b);
  const s1 = sectors.map((x) => x.sector1).sort((a, b) => a - b);
  const s2 = sectors.map((x) => x.sector2).sort((a, b) => a - b);
  const s3 = sectors.map((x) => x.sector3).sort((a, b) => a - b);
  return {
    medianLap: percentile(laps, 0.5),
    medianSectors: [
      percentile(s1, 0.5),
      percentile(s2, 0.5),
      percentile(s3, 0.5),
    ],
  };
}
