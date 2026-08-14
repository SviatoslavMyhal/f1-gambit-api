import { allocationToPerformanceVector } from './performance-vector';
import type {
  BudgetInput,
  CarPerformanceProfile,
  DriverProfile,
  StrategyProfile,
} from './types';

/** Reference allocation tuned for a top-team baseline (not optimal — narrative + fair anchor). */
export const REFERENCE_TOP_TEAM_ALLOCATION: BudgetInput = {
  aero: 22,
  powerUnit: 18,
  chassis: 18,
  driverMarket: 20,
  reliability: 12,
  operations: 10,
};

/**
 * Legacy profile split — derived from the same performance vector as the race engine.
 */
export function mapBudgetToProfiles(budget: BudgetInput): {
  car: CarPerformanceProfile;
  driver: DriverProfile;
  strategy: StrategyProfile;
} {
  const v = allocationToPerformanceVector(budget);
  const car: CarPerformanceProfile = {
    aeroEfficiency: v.cornering,
    straightLineSpeed: v.topSpeed,
    tireDegradation: v.tireWear,
    reliability: v.reliabilityScore,
  };
  const driver: DriverProfile = {
    pace: v.driverSkill,
    consistency: Math.min(
      1,
      v.driverSkill * 0.92 + 0.08 * (1 - v.tireWear),
    ),
    overtakingSkill: Math.min(
      1,
      v.driverSkill * 0.9 + v.cornering * 0.1,
    ),
    wetPerformance: v.driverSkill,
  };
  const strategy: StrategyProfile = {
    pitEfficiency: 1 - v.pitStopTime,
  };
  return { car, driver, strategy };
}

/** Single scalar pace index for sorting (0 = worst, 1 = best). */
export function paceIndexFromProfiles(
  car: CarPerformanceProfile,
  driver: DriverProfile,
  strategy: StrategyProfile,
  weights: TrackWeights,
): number {
  const w = weights;
  return (
    w.aero * car.aeroEfficiency +
    w.power * car.straightLineSpeed +
    w.tire * (1 - car.tireDegradation) +
    w.rel * car.reliability +
    w.driverPace * driver.pace +
    w.consistency * driver.consistency +
    w.overtake * driver.overtakingSkill +
    w.wet * driver.wetPerformance +
    w.strategy * strategy.pitEfficiency
  );
}

export type TrackWeights = {
  aero: number;
  power: number;
  tire: number;
  rel: number;
  driverPace: number;
  consistency: number;
  overtake: number;
  wet: number;
  strategy: number;
};

export function defaultTrackWeights(): TrackWeights {
  return {
    aero: 0.14,
    power: 0.14,
    tire: 0.08,
    rel: 0.08,
    driverPace: 0.18,
    consistency: 0.12,
    overtake: 0.08,
    wet: 0.06,
    strategy: 0.12,
  };
}
