/**
 * Integration: SimulationEngine output → downstream utilities
 *
 * These tests cross module boundaries without any mocks.  The goal is to
 * confirm that the data contract between SimulationEngine and every consumer
 * (computeGridRaceResult, lapsWithSectorsFromTelemetry, buildSectorHeatmap,
 * buildSimulatedLeadChangeEvents) holds together as a coherent pipeline.
 */

import { CarSetupDto } from '../../src/modules/setup/dto/car-setup.dto';
import { TireCompound } from '../../src/modules/setup/dto/tire-compound';
import type { RaceStrategy } from '../../src/modules/simulation/strategy/race-strategy';
import type { TrackModel } from '../../src/modules/simulation/engine/simulation.engine';
import { SimulationEngine } from '../../src/modules/simulation/engine/simulation.engine';
import {
  computeGridRaceResult,
  type GridRaceOutcome,
} from '../../src/modules/simulation/engine/race-competition.lib';
import { lapsWithSectorsFromTelemetry } from '../../src/modules/simulation/laps-map.util';
import { buildSectorHeatmap } from '../../src/modules/simulation/sector-heatmap.util';
import { buildSimulatedLeadChangeEvents } from '../../src/modules/simulation/multiplayer-timeline.util';
import { TRACK_SEEDS } from '../../src/database/seeds/track-seeds';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTrack(slug: string): TrackModel {
  const seed = TRACK_SEEDS.find((t) => t.slug === slug);
  if (!seed) throw new Error(`Track seed '${slug}' not found`);
  return {
    slug: seed.slug,
    laps: seed.laps,
    corners: seed.corners,
    trackTemperatureC: seed.trackTemperatureC,
    averageSpeedKph: seed.averageSpeedKph,
    sectors: seed.sectors,
    corners_data: seed.corners_data,
    characteristics: seed.characteristics,
  };
}

function minimalStrategy(laps: number): RaceStrategy {
  const pitLap = Math.floor(laps * 0.4);
  return {
    stints: [
      { stint: 0, compound: TireCompound.SOFT,   startLap: 1,          targetEndLap: pitLap, pushMode: 'PUSH' },
      { stint: 1, compound: TireCompound.HARD,   startLap: pitLap + 1, targetEndLap: laps,   pushMode: 'MANAGE' },
    ],
    pitWindows: [],
    targetLapTime: 90,
    underFuelThreshold: 5,
  };
}

function baseSetup(overrides: Partial<CarSetupDto> = {}): CarSetupDto {
  return Object.assign<Partial<CarSetupDto>, CarSetupDto>({}, {
    frontWing: 6, rearWing: 6, suspensionStiffness: 5, brakeBias: 58,
    rideHeight: 5, differentialOnThrottle: 75,
    startingCompound: TireCompound.MEDIUM, fuelLoad: 2,
    ...overrides,
  } as CarSetupDto);
}

const FIXED_SEED = 42;

function runEngine(setup: CarSetupDto, track: TrackModel, sessionId: string) {
  const engine = new SimulationEngine(setup, track, minimalStrategy(track.laps), FIXED_SEED, sessionId);
  return engine.run();
}

// ── SimulationEngine → computeGridRaceResult ─────────────────────────────────

describe('SimulationEngine → computeGridRaceResult', () => {
  const GRID_SIZE = 20;
  const monza = makeTrack('monza');

  it('player position is always within [1, gridSize]', () => {
    const { totalRaceTimeSeconds } = runEngine(baseSetup(), monza, 's1-r1-pos');
    const outcome = computeGridRaceResult(totalRaceTimeSeconds, {
      gridSize: GRID_SIZE,
      seedNumber: 42,
      trackSlug: monza.slug,
    });
    expect(outcome.playerPosition).toBeGreaterThanOrEqual(1);
    expect(outcome.playerPosition).toBeLessThanOrEqual(GRID_SIZE);
  });

  it('raceTopFinishers contains the top 5 grid positions', () => {
    const { totalRaceTimeSeconds } = runEngine(baseSetup(), monza, 's1-r1-grid');
    const outcome = computeGridRaceResult(totalRaceTimeSeconds, {
      gridSize: GRID_SIZE,
      seedNumber: 42,
      trackSlug: monza.slug,
    });
    expect(outcome.raceTopFinishers.length).toBeLessThanOrEqual(5);
    expect(outcome.raceTopFinishers.length).toBeGreaterThan(0);
  });

  it('at most one entry in raceTopFinishers has isPlayer=true', () => {
    const { totalRaceTimeSeconds } = runEngine(baseSetup(), monza, 's1-r1-player-flag');
    const outcome = computeGridRaceResult(totalRaceTimeSeconds, {
      gridSize: GRID_SIZE,
      seedNumber: 42,
      trackSlug: monza.slug,
    });
    const playerEntries = outcome.raceTopFinishers.filter((e) => e.isPlayer);
    expect(playerEntries.length).toBeLessThanOrEqual(1);
  });

  it('deterministic: same seed + same setup → identical outcome', () => {
    const opts = { gridSize: GRID_SIZE, seedNumber: 99, trackSlug: monza.slug };
    const setup = baseSetup();
    const run1 = runEngine(setup, monza, 'det-1');
    const run2 = runEngine(setup, monza, 'det-2'); // sessionId differs → same rng (setup-based)
    const o1 = computeGridRaceResult(run1.totalRaceTimeSeconds, opts);
    const o2 = computeGridRaceResult(run2.totalRaceTimeSeconds, opts);
    // Same setup → same lap times → same total → same grid outcome
    expect(o1.playerPosition).toBe(o2.playerPosition);
  });

  it('high-downforce (Spa) setup scores a valid Spa position', () => {
    const spa = makeTrack('spa');
    const highDF = baseSetup({ frontWing: 10, rearWing: 10 });
    const { totalRaceTimeSeconds } = runEngine(highDF, spa, 's1-spa-df');
    const outcome = computeGridRaceResult(totalRaceTimeSeconds, {
      gridSize: 10,
      seedNumber: 7,
      trackSlug: spa.slug,
    });
    expect(outcome.playerPosition).toBeGreaterThanOrEqual(1);
    expect(outcome.playerPosition).toBeLessThanOrEqual(10);
  });

  it('fieldBaselineSeconds overrides relative rivalscaling', () => {
    const { totalRaceTimeSeconds } = runEngine(baseSetup(), monza, 's1-r1-baseline');
    // Anchor rivals 10% faster than the player — player should be near the back
    const slowOutcome = computeGridRaceResult(totalRaceTimeSeconds, {
      gridSize: 5,
      seedNumber: 1,
      trackSlug: monza.slug,
      fieldBaselineSeconds: totalRaceTimeSeconds * 0.9,
    });
    expect(slowOutcome.playerPosition).toBeGreaterThan(1);
  });
});

// ── Engine × 2 → lapsWithSectors → buildSectorHeatmap ───────────────────────

describe('SimulationEngine × 2 → buildSectorHeatmap', () => {
  const monza = makeTrack('monza');

  it('heatmap has exactly 3 sector rows', () => {
    const r1 = runEngine(baseSetup({ frontWing: 8 }), monza, 'hm-s1');
    const r2 = runEngine(baseSetup({ frontWing: 4 }), monza, 'hm-s2');
    const selfLaps = lapsWithSectorsFromTelemetry(r1.telemetry);
    const oppLaps  = lapsWithSectorsFromTelemetry(r2.telemetry);
    const heatmap  = buildSectorHeatmap(selfLaps, oppLaps);
    expect(heatmap).toHaveLength(3);
  });

  it('each sector row has the same lap count', () => {
    const r1 = runEngine(baseSetup(), monza, 'hm-len-s1');
    const r2 = runEngine(baseSetup(), monza, 'hm-len-s2');
    const selfLaps = lapsWithSectorsFromTelemetry(r1.telemetry);
    const oppLaps  = lapsWithSectorsFromTelemetry(r2.telemetry);
    const heatmap  = buildSectorHeatmap(selfLaps, oppLaps);
    const [s1, s2, s3] = heatmap;
    expect(s1.length).toBe(s2.length);
    expect(s2.length).toBe(s3.length);
  });

  it('every cell is one of the four valid classification values', () => {
    const r1 = runEngine(baseSetup({ brakeBias: 60 }), monza, 'hm-cell-s1');
    const r2 = runEngine(baseSetup({ brakeBias: 55 }), monza, 'hm-cell-s2');
    const selfLaps = lapsWithSectorsFromTelemetry(r1.telemetry);
    const oppLaps  = lapsWithSectorsFromTelemetry(r2.telemetry);
    const heatmap  = buildSectorHeatmap(selfLaps, oppLaps);
    const valid = new Set(['pb', 'sb', 'improved', 'none']);
    for (const row of heatmap) {
      for (const cell of row) {
        expect(valid.has(cell)).toBe(true);
      }
    }
  });

  it('lapsWithSectorsFromTelemetry produces one row per recorded lap', () => {
    const r = runEngine(baseSetup(), monza, 'laps-count');
    const laps = lapsWithSectorsFromTelemetry(r.telemetry);
    // The engine records sectorSplits per lap; each split becomes a row
    expect(laps.length).toBeGreaterThan(0);
    expect(laps.length).toBe(r.telemetry.sectorSplits.length);
  });
});

// ── Engine × 2 → buildSimulatedLeadChangeEvents ──────────────────────────────

describe('SimulationEngine × 2 → buildSimulatedLeadChangeEvents', () => {
  const monza = makeTrack('monza');

  it('returns an array (even if no lead changes occurred)', () => {
    const r1 = runEngine(baseSetup(), monza, 'lc-s1');
    const r2 = runEngine(baseSetup(), monza, 'lc-s2');
    const events = buildSimulatedLeadChangeEvents(r1.telemetry, r2.telemetry);
    expect(Array.isArray(events)).toBe(true);
  });

  it('every event has lap, type, side, and detail fields', () => {
    const r1 = runEngine(baseSetup({ frontWing: 10 }), monza, 'lc-fields-s1');
    const r2 = runEngine(baseSetup({ frontWing: 2  }), monza, 'lc-fields-s2');
    const events = buildSimulatedLeadChangeEvents(r1.telemetry, r2.telemetry);
    for (const e of events) {
      expect(e).toHaveProperty('lap');
      expect(e).toHaveProperty('type');
      expect(e).toHaveProperty('side');
      expect(e).toHaveProperty('detail');
    }
  });

  it('lap numbers in events fall within the race lap range', () => {
    const r1 = runEngine(baseSetup(), monza, 'lc-range-s1');
    const r2 = runEngine(baseSetup({ rearWing: 10 }), monza, 'lc-range-s2');
    const events = buildSimulatedLeadChangeEvents(r1.telemetry, r2.telemetry);
    for (const e of events) {
      expect(e.lap).toBeGreaterThanOrEqual(1);
      expect(e.lap).toBeLessThanOrEqual(monza.laps);
    }
  });

  it('[simulation] marker appears in every event detail', () => {
    const r1 = runEngine(baseSetup({ frontWing: 10 }), monza, 'lc-marker-s1');
    const r2 = runEngine(baseSetup({ frontWing: 2  }), monza, 'lc-marker-s2');
    const events = buildSimulatedLeadChangeEvents(r1.telemetry, r2.telemetry);
    for (const e of events) {
      expect(e.detail).toContain('[simulation]');
    }
  });

  it('same seed → both engines emit SAFETY_CAR events on identical laps (shared RNG contract)', () => {
    // sharedRng is seeded from FIXED_SEED only (not sessionId), so safety car
    // triggers must be at the same laps regardless of setup or sessionId.
    const r1 = runEngine(baseSetup({ frontWing: 10 }), monza, 'sc-seed-s1');
    const r2 = runEngine(baseSetup({ frontWing: 2  }), monza, 'sc-seed-s2');
    const sc1 = r1.telemetry.events.filter((e) => e.type === 'SAFETY_CAR').map((e) => e.lap);
    const sc2 = r2.telemetry.events.filter((e) => e.type === 'SAFETY_CAR').map((e) => e.lap);
    expect(sc1).toEqual(sc2);
  });
});
