import { TireCompound } from '../setup/dto/tire-compound';
import type { SessionTelemetry } from '../telemetry/telemetry.types';
import { lapsWithSectorsFromTelemetry } from './laps-map.util';

describe('lapsWithSectorsFromTelemetry', () => {
  it('merges lapTimes and sectorSplits by index', () => {
    const telemetry: SessionTelemetry = {
      sessionId: 'test',
      trackSlug: 'test',
      totalLaps: 2,
      speedTrace: [],
      lapTimes: [
        {
          lap: 1,
          timeSeconds: 90,
          delta: 0,
          isPersonalBest: true,
          compound: TireCompound.SOFT,
          tireAge: 0,
          fuelCorrected: 0,
        },
        {
          lap: 2,
          timeSeconds: 89,
          delta: -1,
          isPersonalBest: true,
          compound: TireCompound.SOFT,
          tireAge: 1,
          fuelCorrected: 0,
        },
      ],
      sectorSplits: [
        {
          lap: 1,
          sector1: 30,
          sector2: 30,
          sector3: 30,
          sector1Delta: 0,
          sector2Delta: 0,
          sector3Delta: 0,
        },
        {
          lap: 2,
          sector1: 29,
          sector2: 30,
          sector3: 30,
          sector1Delta: -0.1,
          sector2Delta: 0,
          sector3Delta: 0,
        },
      ],
      tireData: [],
      events: [],
      strategy: [],
      advancedLaps: [],
      telemetryStream: [],
    };

    expect(lapsWithSectorsFromTelemetry(telemetry)).toEqual([
      { lap: 1, timeSeconds: 90, sectors: [30, 30, 30] },
      { lap: 2, timeSeconds: 89, sectors: [29, 30, 30] },
    ]);
  });

  it('appends lap-only rows when sectorSplits is shorter', () => {
    const telemetry: SessionTelemetry = {
      sessionId: 'test',
      trackSlug: 'test',
      totalLaps: 2,
      speedTrace: [],
      lapTimes: [
        {
          lap: 1,
          timeSeconds: 90,
          delta: 0,
          isPersonalBest: true,
          compound: TireCompound.SOFT,
          tireAge: 0,
          fuelCorrected: 0,
        },
        {
          lap: 2,
          timeSeconds: 89,
          delta: 0,
          isPersonalBest: false,
          compound: TireCompound.SOFT,
          tireAge: 1,
          fuelCorrected: 0,
        },
      ],
      sectorSplits: [
        {
          lap: 1,
          sector1: 30,
          sector2: 30,
          sector3: 30,
          sector1Delta: 0,
          sector2Delta: 0,
          sector3Delta: 0,
        },
      ],
      tireData: [],
      events: [],
      strategy: [],
    };

    expect(lapsWithSectorsFromTelemetry(telemetry)).toEqual([
      { lap: 1, timeSeconds: 90, sectors: [30, 30, 30] },
      { lap: 2, timeSeconds: 89 },
    ]);
  });
});
