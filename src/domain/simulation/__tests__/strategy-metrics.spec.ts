import { applyStrategyMetricsToVector } from '../strategy-metrics';
import type { PerformanceVector } from '../types';

const BASE: PerformanceVector = {
  cornering: 0.6,
  topSpeed: 0.6,
  tireWear: 0.3,
  reliabilityScore: 0.8,
  pitStopTime: 0.4,
  driverSkill: 0.7,
};

describe('applyStrategyMetricsToVector', () => {
  it('returns the original vector when metrics is null', () => {
    expect(applyStrategyMetricsToVector(BASE, null)).toEqual(BASE);
  });

  it('returns the original vector when metrics is undefined', () => {
    expect(applyStrategyMetricsToVector(BASE, undefined)).toEqual(BASE);
  });

  it('neutral values (0.5) leave all fields unchanged', () => {
    const result = applyStrategyMetricsToVector(BASE, {
      pitAggression: 0.5,
      paceFocus: 0.5,
      consistency: 0.5,
    });
    expect(result.pitStopTime).toBeCloseTo(BASE.pitStopTime, 10);
    expect(result.cornering).toBeCloseTo(BASE.cornering, 10);
    expect(result.topSpeed).toBeCloseTo(BASE.topSpeed, 10);
    expect(result.tireWear).toBeCloseTo(BASE.tireWear, 10);
    expect(result.driverSkill).toBeCloseTo(BASE.driverSkill, 10);
  });

  it('high pitAggression (1.0) reduces pitStopTime relative to low aggression (0.0)', () => {
    // pitDelta = (0.5 - pitAgg) * 0.16 → high aggression subtracts from pitStopTime
    const highAgg = applyStrategyMetricsToVector(BASE, { pitAggression: 1.0 });
    const lowAgg = applyStrategyMetricsToVector(BASE, { pitAggression: 0.0 });
    expect(highAgg.pitStopTime).toBeLessThan(lowAgg.pitStopTime);
  });

  it('high paceFocus (1.0) increases cornering above neutral', () => {
    const neutral = applyStrategyMetricsToVector(BASE, { paceFocus: 0.5 });
    const focused = applyStrategyMetricsToVector(BASE, { paceFocus: 1.0 });
    expect(focused.cornering).toBeGreaterThan(neutral.cornering);
  });

  it('low paceFocus (0.0) increases tireWear relative to neutral', () => {
    const conservative = applyStrategyMetricsToVector(BASE, { paceFocus: 0.0 });
    const neutral = applyStrategyMetricsToVector(BASE, { paceFocus: 0.5 });
    expect(conservative.tireWear).toBeGreaterThan(neutral.tireWear);
  });

  it('high consistency (1.0) increases driverSkill above neutral', () => {
    const high = applyStrategyMetricsToVector(BASE, { consistency: 1.0 });
    const low = applyStrategyMetricsToVector(BASE, { consistency: 0.0 });
    expect(high.driverSkill).toBeGreaterThan(low.driverSkill);
  });

  it('all output values stay clamped to [0, 1] at extreme high input', () => {
    const maxBase: PerformanceVector = {
      cornering: 1, topSpeed: 1, tireWear: 1,
      reliabilityScore: 1, pitStopTime: 1, driverSkill: 1,
    };
    const result = applyStrategyMetricsToVector(maxBase, {
      pitAggression: 0, paceFocus: 1, consistency: 1,
    });
    for (const val of Object.values(result)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('all output values stay clamped to [0, 1] at extreme low input', () => {
    const zeroBase: PerformanceVector = {
      cornering: 0, topSpeed: 0, tireWear: 0,
      reliabilityScore: 0, pitStopTime: 0, driverSkill: 0,
    };
    const result = applyStrategyMetricsToVector(zeroBase, {
      pitAggression: 1, paceFocus: 0, consistency: 0,
    });
    for (const val of Object.values(result)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('does not mutate the original vector', () => {
    const before = { ...BASE };
    applyStrategyMetricsToVector(BASE, { paceFocus: 0.9, pitAggression: 0.1 });
    expect(BASE).toEqual(before);
  });

  it('reliabilityScore is always preserved (not modified by strategy)', () => {
    const result = applyStrategyMetricsToVector(BASE, {
      pitAggression: 0, paceFocus: 1, consistency: 0,
    });
    expect(result.reliabilityScore).toBe(BASE.reliabilityScore);
  });
});
