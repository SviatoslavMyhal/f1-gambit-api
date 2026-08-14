import {
  REFERENCE_TOP_TEAM_ALLOCATION,
  mapBudgetToProfiles,
  paceIndexFromProfiles,
  defaultTrackWeights,
} from '../budget-mapper';
import type { BudgetInput } from '../types';

const VALID: BudgetInput = {
  aero: 22, powerUnit: 18, chassis: 18,
  driverMarket: 20, reliability: 12, operations: 10,
};

const ELITE: BudgetInput = {
  aero: 30, powerUnit: 25, chassis: 20,
  driverMarket: 15, reliability: 5, operations: 5,
};

const POOR: BudgetInput = {
  aero: 5, powerUnit: 5, chassis: 5,
  driverMarket: 5, reliability: 40, operations: 40,
};

describe('REFERENCE_TOP_TEAM_ALLOCATION', () => {
  it('all allocations sum to 100', () => {
    const total = Object.values(REFERENCE_TOP_TEAM_ALLOCATION).reduce(
      (s, v) => s + v,
      0,
    );
    expect(total).toBe(100);
  });

  it('every allocation is a positive number', () => {
    for (const v of Object.values(REFERENCE_TOP_TEAM_ALLOCATION)) {
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe('mapBudgetToProfiles', () => {
  it('returns profiles with all values in [0, 1] for a valid budget', () => {
    const { car, driver, strategy } = mapBudgetToProfiles(VALID);
    const allValues = [
      car.aeroEfficiency, car.straightLineSpeed, car.tireDegradation, car.reliability,
      driver.pace, driver.consistency, driver.overtakingSkill, driver.wetPerformance,
      strategy.pitEfficiency,
    ];
    for (const v of allValues) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    expect(mapBudgetToProfiles(VALID)).toEqual(mapBudgetToProfiles(VALID));
  });

  it('car.aeroEfficiency maps from cornering performance vector', () => {
    const aeroBudget: BudgetInput = {
      aero: 40, powerUnit: 10, chassis: 15,
      driverMarket: 15, reliability: 10, operations: 10,
    };
    const powerBudget: BudgetInput = {
      aero: 10, powerUnit: 40, chassis: 15,
      driverMarket: 15, reliability: 10, operations: 10,
    };
    const aeroProfiles = mapBudgetToProfiles(aeroBudget);
    const powerProfiles = mapBudgetToProfiles(powerBudget);
    expect(aeroProfiles.car.aeroEfficiency).toBeGreaterThan(
      powerProfiles.car.aeroEfficiency,
    );
  });
});

describe('paceIndexFromProfiles', () => {
  it('returns a finite number in [0, 1] for a typical budget', () => {
    const { car, driver, strategy } = mapBudgetToProfiles(VALID);
    const pace = paceIndexFromProfiles(car, driver, strategy, defaultTrackWeights());
    expect(isFinite(pace)).toBe(true);
    expect(pace).toBeGreaterThanOrEqual(0);
    expect(pace).toBeLessThanOrEqual(1);
  });

  it('elite budget yields higher pace index than poor budget', () => {
    const eliteP = mapBudgetToProfiles(ELITE);
    const poorP = mapBudgetToProfiles(POOR);
    const w = defaultTrackWeights();
    const elitePace = paceIndexFromProfiles(eliteP.car, eliteP.driver, eliteP.strategy, w);
    const poorPace = paceIndexFromProfiles(poorP.car, poorP.driver, poorP.strategy, w);
    expect(elitePace).toBeGreaterThan(poorPace);
  });
});

describe('defaultTrackWeights', () => {
  it('weights sum to 1.0', () => {
    const total = Object.values(defaultTrackWeights()).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('all weights are positive', () => {
    for (const v of Object.values(defaultTrackWeights())) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('returns a fresh object each call (not shared state)', () => {
    const a = defaultTrackWeights();
    const b = defaultTrackWeights();
    a.aero = 999;
    expect(b.aero).not.toBe(999);
  });
});
