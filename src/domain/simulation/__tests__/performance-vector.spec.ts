import {
  allocationToPerformanceVector,
  paceFromPerformanceVector,
} from '../performance-vector';
import type { BudgetInput } from '../types';

const BALANCED: BudgetInput = {
  aero: 17, powerUnit: 17, chassis: 17,
  driverMarket: 17, reliability: 16, operations: 16,
};

const AERO_HEAVY: BudgetInput = {
  aero: 40, powerUnit: 10, chassis: 15,
  driverMarket: 15, reliability: 10, operations: 10,
};

const POWER_HEAVY: BudgetInput = {
  aero: 10, powerUnit: 40, chassis: 15,
  driverMarket: 15, reliability: 10, operations: 10,
};

const ZERO: BudgetInput = {
  aero: 0, powerUnit: 0, chassis: 0,
  driverMarket: 0, reliability: 0, operations: 0,
};

describe('allocationToPerformanceVector', () => {
  it('all output values are in [0, 1] for balanced budget', () => {
    const v = allocationToPerformanceVector(BALANCED);
    for (const val of Object.values(v)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('all output values are in [0, 1] for extreme budgets', () => {
    for (const budget of [AERO_HEAVY, POWER_HEAVY, ZERO]) {
      const v = allocationToPerformanceVector(budget);
      for (const val of Object.values(v)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it('aero-heavy budget → cornering > topSpeed', () => {
    const v = allocationToPerformanceVector(AERO_HEAVY);
    expect(v.cornering).toBeGreaterThan(v.topSpeed);
  });

  it('power-heavy budget → topSpeed > cornering', () => {
    const v = allocationToPerformanceVector(POWER_HEAVY);
    expect(v.topSpeed).toBeGreaterThan(v.cornering);
  });

  it('is deterministic (no internal randomness)', () => {
    expect(allocationToPerformanceVector(BALANCED)).toEqual(
      allocationToPerformanceVector(BALANCED),
    );
  });

  it('all-zero budget does not throw and returns finite values', () => {
    const v = allocationToPerformanceVector(ZERO);
    for (const val of Object.values(v)) {
      expect(isFinite(val)).toBe(true);
    }
  });

  it('returns an object with all six required fields', () => {
    const v = allocationToPerformanceVector(BALANCED);
    expect(v).toHaveProperty('cornering');
    expect(v).toHaveProperty('topSpeed');
    expect(v).toHaveProperty('tireWear');
    expect(v).toHaveProperty('reliabilityScore');
    expect(v).toHaveProperty('pitStopTime');
    expect(v).toHaveProperty('driverSkill');
  });
});

describe('paceFromPerformanceVector', () => {
  const v = allocationToPerformanceVector(BALANCED);

  it('dry pace is greater than wet pace for the same vector', () => {
    const dry = paceFromPerformanceVector(v, 'balanced', 'dry');
    const wet = paceFromPerformanceVector(v, 'balanced', 'wet');
    expect(dry).toBeGreaterThan(wet);
  });

  it('dry pace is greater than mixed pace', () => {
    const dry = paceFromPerformanceVector(v, 'balanced', 'dry');
    const mixed = paceFromPerformanceVector(v, 'balanced', 'mixed');
    expect(dry).toBeGreaterThan(mixed);
  });

  it('downforce track rewards aero-heavy vector more relative to power track', () => {
    const aeroV = allocationToPerformanceVector(AERO_HEAVY);
    const powerV = allocationToPerformanceVector(POWER_HEAVY);

    const aeroAdvantageOnDownforce =
      paceFromPerformanceVector(aeroV, 'downforce', 'dry') -
      paceFromPerformanceVector(powerV, 'downforce', 'dry');

    const aeroAdvantageOnPower =
      paceFromPerformanceVector(aeroV, 'power', 'dry') -
      paceFromPerformanceVector(powerV, 'power', 'dry');

    expect(aeroAdvantageOnDownforce).toBeGreaterThan(aeroAdvantageOnPower);
  });

  it('returns a finite number for all weather/bias combinations', () => {
    const biases = ['balanced', 'downforce', 'power'] as const;
    const weathers = ['dry', 'mixed', 'wet'] as const;
    for (const bias of biases) {
      for (const weather of weathers) {
        expect(isFinite(paceFromPerformanceVector(v, bias, weather))).toBe(true);
      }
    }
  });
});
