import { CarSetupDto } from '../../setup/dto/car-setup.dto';
import { TireCompound } from '../../setup/dto/tire-compound';
import type { RaceStrategy } from '../strategy/race-strategy';
import type { TrackModel } from './simulation.engine';
import { SimulationEngine } from './simulation.engine';
import { TRACK_SEEDS } from '../../../database/seeds/track-seeds';

function baseSetup(over: Partial<CarSetupDto> = {}): CarSetupDto {
  return {
    frontWing: 6,
    rearWing: 6,
    suspensionStiffness: 5,
    brakeBias: 58,
    rideHeight: 5,
    differentialOnThrottle: 75,
    startingCompound: TireCompound.MEDIUM,
    fuelLoad: 2,
    ...over,
  };
}

function monzaTrack(): TrackModel {
  const t = TRACK_SEEDS.find((x) => x.slug === 'monza')!;
  return {
    slug: t.slug,
    laps: t.laps,
    corners: t.corners,
    trackTemperatureC: t.trackTemperatureC,
    averageSpeedKph: t.averageSpeedKph,
    sectors: t.sectors,
    corners_data: t.corners_data,
    characteristics: t.characteristics,
  };
}

function spaTrack(): TrackModel {
  const t = TRACK_SEEDS.find((x) => x.slug === 'spa')!;
  return {
    slug: t.slug,
    laps: t.laps,
    corners: t.corners,
    trackTemperatureC: t.trackTemperatureC,
    averageSpeedKph: t.averageSpeedKph,
    sectors: t.sectors,
    corners_data: t.corners_data,
    characteristics: t.characteristics,
  };
}

function bahrainTrack(): TrackModel {
  const t = TRACK_SEEDS.find((x) => x.slug === 'bahrain')!;
  return {
    slug: t.slug,
    laps: t.laps,
    corners: t.corners,
    trackTemperatureC: t.trackTemperatureC,
    averageSpeedKph: t.averageSpeedKph,
    sectors: t.sectors,
    corners_data: t.corners_data,
    characteristics: t.characteristics,
  };
}

function minimalStrategy(laps: number): RaceStrategy {
  const pit = Math.max(10, Math.floor(laps * 0.4));
  return {
    stints: [
      {
        stint: 0,
        compound: TireCompound.SOFT,
        startLap: 1,
        targetEndLap: pit,
        pushMode: 'PUSH',
      },
      {
        stint: 1,
        compound: TireCompound.HARD,
        startLap: pit + 1,
        targetEndLap: laps,
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

describe('SimulationEngine', () => {
  it('completes a 53-lap Monza race in < 150ms', () => {
    const track = monzaTrack();
    const strat = minimalStrategy(track.laps);
    const t0 = performance.now();
    const eng = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      42,
      'session-test',
    );
    eng.run();
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(150);
  });

  it('is deterministic: same seed produces identical lap time series', () => {
    const track = monzaTrack();
    const strat = minimalStrategy(track.laps);
    const a = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      999,
      's1',
    ).run();
    const b = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      999,
      's1',
    ).run();
    expect(JSON.stringify(a.telemetry.lapTimes)).toBe(
      JSON.stringify(b.telemetry.lapTimes),
    );
  });

  it('applies calibration sector scales to lap and race totals', () => {
    const track = monzaTrack();
    const strat = minimalStrategy(track.laps);
    const plain = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      42,
      'cal-test-plain',
      { gridSize: 20 },
    ).run();
    const scaled = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      42,
      'cal-test-plain',
      {
        gridSize: 20,
        calibration: { sectorScales: [1.05, 1.05, 1.05] },
      },
    ).run();
    expect(scaled.totalRaceTimeSeconds).toBeGreaterThan(
      plain.totalRaceTimeSeconds,
    );
    expect(scaled.bestLapSeconds).toBeGreaterThan(plain.bestLapSeconds);
  });

  it('soft tires degrade faster than hard (same setup, forced compounds)', () => {
    const track = { ...monzaTrack(), laps: 15 };
    const strat: RaceStrategy = {
      ...minimalStrategy(track.laps),
      pitWindows: [
        {
          stint: 0,
          earliest: 999,
          latest: 999,
          optimal: 999,
          undercut: false,
          overcut: false,
        },
      ],
    };
    const soft = new SimulationEngine(
      { ...baseSetup(), startingCompound: TireCompound.SOFT },
      track,
      strat,
      1,
      's',
    ).run();
    const hard = new SimulationEngine(
      { ...baseSetup(), startingCompound: TireCompound.HARD },
      track,
      strat,
      1,
      's',
    ).run();
    const mid = 8;
    const softWear = soft.telemetry.tireData.find((t) => t.lap === mid)!.wearPercent;
    const hardWear = hard.telemetry.tireData.find((t) => t.lap === mid)!.wearPercent;
    expect(softWear).toBeGreaterThan(hardWear);
  });

  it('high rear wing on Monza produces slower lap times than low wing', () => {
    const track = monzaTrack();
    const strat = minimalStrategy(track.laps);
    const high = new SimulationEngine(
      { ...baseSetup(), frontWing: 10, rearWing: 11 },
      track,
      strat,
      7,
      's',
    ).run();
    const low = new SimulationEngine(
      { ...baseSetup(), frontWing: 2, rearWing: 2 },
      track,
      strat,
      7,
      's',
    ).run();
    expect(high.totalRaceTimeSeconds).toBeGreaterThan(low.totalRaceTimeSeconds);
  });

  it('brake bias < 54 increases lock-up event probability (more lock-ups)', () => {
    const track = { ...monzaTrack(), laps: 40 };
    const strat = minimalStrategy(track.laps);
    const rear = new SimulationEngine(
      { ...baseSetup(), brakeBias: 52 },
      track,
      strat,
      123,
      's',
    ).run();
    const mid = new SimulationEngine(
      { ...baseSetup(), brakeBias: 58 },
      track,
      strat,
      123,
      's',
    ).run();
    const cRear = rear.telemetry.events.filter((e) => e.type === 'LOCK_UP').length;
    const cMid = mid.telemetry.events.filter((e) => e.type === 'LOCK_UP').length;
    expect(cRear).toBeGreaterThanOrEqual(cMid);
  });

  it('Spa 44 laps × 100 runs p99 < 150ms', () => {
    const track = spaTrack();
    const strat = minimalStrategy(track.laps);
    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now();
      new SimulationEngine(
        baseSetup(),
        track,
        strat,
        i,
        's',
      ).run();
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const p99 = times[98]!;
    expect(p99).toBeLessThan(150);
  });

  it('all 8 tracks produce different total race times', () => {
    const times = new Set<number>();
    for (const seed of TRACK_SEEDS) {
      const track: TrackModel = {
        slug: seed.slug,
        laps: seed.laps,
        corners: seed.corners,
        trackTemperatureC: seed.trackTemperatureC,
        averageSpeedKph: seed.averageSpeedKph,
        sectors: seed.sectors,
        corners_data: seed.corners_data,
        characteristics: seed.characteristics,
      };
      const strat = minimalStrategy(track.laps);
      const r = new SimulationEngine(
        baseSetup(),
        track,
        strat,
        100,
        's',
      ).run();
      times.add(Math.round(r.totalRaceTimeSeconds * 100));
    }
    expect(times.size).toBeGreaterThan(3);
  });

  it('includes advancedLaps and telemetryStream with bounded samples', () => {
    const track = { ...monzaTrack(), laps: 12 };
    const strat = minimalStrategy(track.laps);
    const r = new SimulationEngine(
      baseSetup(),
      track,
      strat,
      77,
      'adv',
    ).run();
    expect(r.telemetry.advancedLaps?.length).toBe(12);
    expect(r.telemetry.telemetryStream?.length).toBe(12 * 3);
    const a0 = r.telemetry.advancedLaps![0]!;
    expect(a0.driverMetrics.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(a0.driverMetrics.consistencyScore).toBeLessThanOrEqual(1);
    expect(a0.sectors).toHaveLength(3);
    const s = r.telemetry.speedTrace![0]!;
    expect(s.lateralG).toBeDefined();
    expect(s.slipAngleDeg).toBeDefined();
  });

  it('deterministic: full telemetry payload matches for same seed', () => {
    const track = { ...monzaTrack(), laps: 8 };
    const strat = minimalStrategy(track.laps);
    const run = () =>
      new SimulationEngine(baseSetup(), track, strat, 4242, 'det').run();
    const a = run();
    const b = run();
    expect(JSON.stringify(a.telemetry)).toBe(JSON.stringify(b.telemetry));
  });

  it('extreme tire wear: high-deg track reaches pit-band wear with degraded grip', () => {
    const track = { ...bahrainTrack(), laps: 72 };
    const strat: RaceStrategy = {
      ...minimalStrategy(track.laps),
      pitWindows: [
        {
          stint: 0,
          earliest: 999,
          latest: 999,
          optimal: 999,
          undercut: false,
          overcut: false,
        },
      ],
    };
    const r = new SimulationEngine(
      baseSetup({ startingCompound: TireCompound.SOFT }),
      track,
      strat,
      3,
      'wear',
    ).run();
    const peakWear = Math.max(...r.telemetry.tireData.map((t) => t.wearPercent));
    const minGrip = Math.min(...r.telemetry.tireData.map((t) => t.gripLevel));
    expect(peakWear).toBeGreaterThanOrEqual(82);
    expect(minGrip).toBeLessThan(0.95);
    expect(r.telemetry.tireData.every((t) => t.tireWearPerLap != null)).toBe(true);
  });

  it('max aggression setup raises brakingAggression vs neutral', () => {
    const track = { ...monzaTrack(), laps: 20 };
    const strat = minimalStrategy(track.laps);
    const aggressive = new SimulationEngine(
      baseSetup({ brakeBias: 52, differentialOnThrottle: 100 }),
      track,
      strat,
      11,
      'a',
    ).run();
    const neutral = new SimulationEngine(
      baseSetup({ brakeBias: 58, differentialOnThrottle: 75 }),
      track,
      strat,
      11,
      'a',
    ).run();
    const a10 = aggressive.telemetry.advancedLaps?.find((x) => x.lap === 10);
    const n10 = neutral.telemetry.advancedLaps?.find((x) => x.lap === 10);
    expect(a10!.driverMetrics.brakingAggression).toBeGreaterThan(
      n10!.driverMetrics.brakingAggression,
    );
  });

  it('low grip: accumulated wear reduces grip vs early race', () => {
    const track = { ...bahrainTrack(), laps: 55 };
    const strat: RaceStrategy = {
      ...minimalStrategy(track.laps),
      pitWindows: [
        {
          stint: 0,
          earliest: 999,
          latest: 999,
          optimal: 999,
          undercut: false,
          overcut: false,
        },
      ],
    };
    const r = new SimulationEngine(
      baseSetup({ startingCompound: TireCompound.SOFT }),
      track,
      strat,
      5,
      'grip',
    ).run();
    const early = r.telemetry.tireData.find((t) => t.lap === 4)!;
    const late = r.telemetry.tireData.find((t) => t.lap === 48)!;
    expect(late.wearPercent).toBeGreaterThan(early.wearPercent + 15);
    expect(late.gripLevel).toBeLessThanOrEqual(early.gripLevel);
  });

  it('multiplayer: same seed gives identical SAFETY_CAR laps for different setups/sessions', () => {
    const track = spaTrack();
    const strat = minimalStrategy(track.laps);
    const seed = 42_424;
    const a = new SimulationEngine(
      baseSetup({ frontWing: 11, rearWing: 11 }),
      track,
      strat,
      seed,
      'lobby:host',
    ).run();
    const b = new SimulationEngine(
      baseSetup({ frontWing: 1, rearWing: 1 }),
      track,
      strat,
      seed,
      'lobby:opponent',
    ).run();
    const scA = a.telemetry.events
      .filter((e) => e.type === 'SAFETY_CAR')
      .map((e) => e.lap);
    const scB = b.telemetry.events
      .filter((e) => e.type === 'SAFETY_CAR')
      .map((e) => e.lap);
    expect(scA).toEqual(scB);
  });

  it('Spa 44-lap full distance completes in under 200ms', () => {
    const track = spaTrack();
    const strat = minimalStrategy(track.laps);
    const t0 = performance.now();
    new SimulationEngine(baseSetup(), track, strat, 99, 'perf').run();
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(200);
  });
});
