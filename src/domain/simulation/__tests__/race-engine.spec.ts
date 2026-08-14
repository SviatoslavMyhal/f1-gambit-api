import { simulateRaceWithTimeline, RACE_LAPS, SNAPSHOT_LAPS } from '../race-engine';
import type { BudgetInput } from '../types';

const PLAYER: BudgetInput = {
  aero: 22, powerUnit: 18, chassis: 18,
  driverMarket: 20, reliability: 12, operations: 10,
};
const BASELINE: BudgetInput = {
  aero: 20, powerUnit: 20, chassis: 18,
  driverMarket: 19, reliability: 13, operations: 10,
};
const UNRELIABLE: BudgetInput = {
  aero: 30, powerUnit: 35, chassis: 25,
  driverMarket: 10, reliability: 0, operations: 0,
};
const RELIABLE: BudgetInput = {
  aero: 18, powerUnit: 16, chassis: 16,
  driverMarket: 15, reliability: 25, operations: 10,
};

const BASE = {
  seed: 'test-seed',
  seasonYear: 2024,
  raceIndex: 0,
  trackBias: 'balanced' as const,
  playerBudget: PLAYER,
  baselineBudget: BASELINE,
};

describe('simulateRaceWithTimeline', () => {
  it('returns raceId in the expected format', () => {
    expect(simulateRaceWithTimeline(BASE).raceId).toBe('s2024-r1');
  });

  it('raceId increments with raceIndex', () => {
    expect(simulateRaceWithTimeline({ ...BASE, raceIndex: 2 }).raceId).toBe('s2024-r3');
  });

  it('is deterministic for the same inputs', () => {
    expect(simulateRaceWithTimeline(BASE)).toEqual(simulateRaceWithTimeline(BASE));
  });

  it('different seeds → different outcomes', () => {
    const a = simulateRaceWithTimeline({ ...BASE, seed: 'seed-A' });
    const b = simulateRaceWithTimeline({ ...BASE, seed: 'seed-B' });
    // Positions or times differ across seeds
    expect(a.playerPosition !== b.playerPosition || a.weather !== b.weather).toBe(true);
  });

  it('player and baseline positions are in valid range [1, 20]', () => {
    const r = simulateRaceWithTimeline(BASE);
    expect(r.playerPosition).toBeGreaterThanOrEqual(1);
    expect(r.playerPosition).toBeLessThanOrEqual(20);
    expect(r.baselinePosition).toBeGreaterThanOrEqual(1);
    expect(r.baselinePosition).toBeLessThanOrEqual(20);
  });

  it('weather is one of the three valid buckets', () => {
    expect(['dry', 'mixed', 'wet']).toContain(simulateRaceWithTimeline(BASE).weather);
  });

  it('trackBias is echoed in the result', () => {
    expect(simulateRaceWithTimeline({ ...BASE, trackBias: 'downforce' }).trackBias).toBe('downforce');
  });

  it('DNF player gets raceTimeMs === -1 and points === 0', () => {
    let foundDnf = false;
    for (let i = 0; i < 30; i++) {
      const r = simulateRaceWithTimeline({ ...BASE, seed: `dnf-${i}`, playerBudget: UNRELIABLE });
      if (r.playerDnf) {
        expect(r.playerRaceTimeMs).toBe(-1);
        expect(r.playerPoints).toBe(0);
        foundDnf = true;
        break;
      }
    }
    expect(foundDnf).toBe(true);
  });

  it('non-DNF player has positive raceTimeMs', () => {
    let tested = false;
    for (let i = 0; i < 15; i++) {
      const r = simulateRaceWithTimeline({ ...BASE, seed: `rel-${i}`, playerBudget: RELIABLE });
      if (!r.playerDnf) {
        expect(r.playerRaceTimeMs).toBeGreaterThan(0);
        tested = true;
        break;
      }
    }
    expect(tested).toBe(true);
  });

  it('timeline.totalLaps equals RACE_LAPS', () => {
    expect(simulateRaceWithTimeline(BASE).timeline.totalLaps).toBe(RACE_LAPS);
  });

  it('timeline has exactly SNAPSHOT_LAPS.length checkpoints', () => {
    expect(simulateRaceWithTimeline(BASE).timeline.checkpoints).toHaveLength(SNAPSHOT_LAPS.length);
  });

  it('each checkpoint contains positions for all 20 drivers', () => {
    simulateRaceWithTimeline(BASE).timeline.checkpoints.forEach((cp) => {
      expect(cp.positions).toHaveLength(20);
    });
  });

  it('checkpoint lap numbers match SNAPSHOT_LAPS', () => {
    const laps = simulateRaceWithTimeline(BASE).timeline.checkpoints.map((c) => c.lap);
    expect(laps).toEqual(SNAPSHOT_LAPS);
  });

  it('positionSamples length equals checkpoints × 20 drivers', () => {
    const r = simulateRaceWithTimeline(BASE);
    expect(r.timeline.positionSamples).toHaveLength(SNAPSHOT_LAPS.length * 20);
  });

  it('playerPoints and baselinePoints are non-negative', () => {
    const r = simulateRaceWithTimeline(BASE);
    expect(r.playerPoints).toBeGreaterThanOrEqual(0);
    expect(r.baselinePoints).toBeGreaterThanOrEqual(0);
  });
});
