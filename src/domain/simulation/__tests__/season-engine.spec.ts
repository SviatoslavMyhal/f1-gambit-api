import { simulateSeason, RACES_PER_SEASON, SIM_VERSION } from '../season-engine';
import type { SeasonEngineInput } from '../types';

const BASE: SeasonEngineInput = {
  budget: {
    aero: 22, powerUnit: 18, chassis: 18,
    driverMarket: 20, reliability: 12, operations: 10,
  },
  seasonYear: 2024,
  seed: 'test-season-seed',
};

describe('simulateSeason', () => {
  it('returns the correct simVersion constant', () => {
    expect(simulateSeason(BASE).simVersion).toBe(SIM_VERSION);
  });

  it(`produces exactly ${RACES_PER_SEASON} races`, () => {
    expect(simulateSeason(BASE).races).toHaveLength(RACES_PER_SEASON);
  });

  it('is deterministic for the same seed', () => {
    const a = simulateSeason(BASE);
    const b = simulateSeason(BASE);
    expect(a.totals).toEqual(b.totals);
    expect(a.races.map((r) => r.playerPosition)).toEqual(
      b.races.map((r) => r.playerPosition),
    );
  });

  it('different seeds produce different results', () => {
    const a = simulateSeason({ ...BASE, seed: 'alpha' });
    const b = simulateSeason({ ...BASE, seed: 'beta' });
    expect(
      a.totals.playerConstructorPoints !== b.totals.playerConstructorPoints ||
      a.races[0]!.playerPosition !== b.races[0]!.playerPosition,
    ).toBe(true);
  });

  it('totals.playerConstructorPoints equals sum of per-race playerPoints', () => {
    const result = simulateSeason(BASE);
    const sum = result.races.reduce((s, r) => s + r.playerPoints, 0);
    expect(result.totals.playerConstructorPoints).toBe(sum);
  });

  it('totals.baselineConstructorPoints equals sum of per-race baselinePoints', () => {
    const result = simulateSeason(BASE);
    const sum = result.races.reduce((s, r) => s + r.baselinePoints, 0);
    expect(result.totals.baselineConstructorPoints).toBe(sum);
  });

  it('constructorStandings are sorted descending by points', () => {
    const { constructorStandings } = simulateSeason(BASE);
    for (let i = 1; i < constructorStandings.length; i++) {
      expect(constructorStandings[i - 1]!.points).toBeGreaterThanOrEqual(
        constructorStandings[i]!.points,
      );
    }
  });

  it('metrics.dnfRate is in [0, 1]', () => {
    const { metrics } = simulateSeason(BASE);
    expect(metrics.dnfRate).toBeGreaterThanOrEqual(0);
    expect(metrics.dnfRate).toBeLessThanOrEqual(1);
  });

  it('metrics.consistencyScore is in [0, 1]', () => {
    const { metrics } = simulateSeason(BASE);
    expect(metrics.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(metrics.consistencyScore).toBeLessThanOrEqual(1);
  });

  it('metrics.avgFinishingPosition is ≥ 1 when player finishes at least one race', () => {
    const result = simulateSeason(BASE);
    const finishes = result.races.filter((r) => !r.playerDnf);
    if (finishes.length > 0) {
      expect(result.metrics.avgFinishingPosition).toBeGreaterThanOrEqual(1);
    }
  });

  it('seed is echoed in the result', () => {
    expect(simulateSeason(BASE).seed).toBe(BASE.seed);
  });

  it('seasonYear is echoed in the result', () => {
    expect(simulateSeason(BASE).seasonYear).toBe(2024);
  });

  it('includes comparison when compareConstructorRef is provided', () => {
    const result = simulateSeason({ ...BASE, compareConstructorRef: 'red_bull' });
    expect(result.comparison).toBeDefined();
    expect(result.comparison!.constructorRef).toBe('red_bull');
    expect(typeof result.comparison!.summary).toBe('string');
  });

  it('comparison is undefined when compareConstructorRef is absent', () => {
    expect(simulateSeason(BASE).comparison).toBeUndefined();
  });

  it('each race has a unique raceId', () => {
    const ids = simulateSeason(BASE).races.map((r) => r.raceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('raceIndex on each outcome matches its position in the races array', () => {
    simulateSeason(BASE).races.forEach((r, i) => {
      expect(r.raceIndex).toBe(i);
    });
  });

  it('custom baselineBudget is used instead of the reference allocation', () => {
    const customBaseline = {
      aero: 5, powerUnit: 5, chassis: 5,
      driverMarket: 5, reliability: 40, operations: 40,
    };
    const withCustom = simulateSeason({ ...BASE, baselineBudget: customBaseline });
    const withDefault = simulateSeason(BASE);
    // A deliberately weak baseline should usually score fewer points
    expect(withCustom.totals.baselineConstructorPoints).not.toBe(
      withDefault.totals.baselineConstructorPoints,
    );
  });
});
