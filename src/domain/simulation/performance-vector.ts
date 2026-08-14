import { paceWeightForTrack } from './track-profile';
import type {
  BudgetInput,
  PerformanceVector,
  TrackBias,
  WeatherBucket,
} from './types';

export type { PerformanceVector } from './types';

function concave(normalized: number, k = 2.15): number {
  const x = Math.max(0, Math.min(1.5, normalized));
  return 1 - Math.exp(-k * x);
}

/**
 * Maps budget % (sum 100) → performance vector with diminishing returns + trade-offs.
 */
export function allocationToPerformanceVector(
  budget: BudgetInput,
): PerformanceVector {
  const aeroPct = budget.aero / 100;
  const powerPct = budget.powerUnit / 100;
  const chassisPct = budget.chassis / 100;
  const driverPct = budget.driverMarket / 100;
  const relPct = budget.reliability / 100;
  const strategyPct = budget.operations / 100;

  const aeroCore = concave(aeroPct + chassisPct * 0.35);
  const powerCore = concave(powerPct);

  const cornering = Math.min(1, aeroCore * (1 - 0.07 * powerCore));
  const topSpeed = Math.min(1, powerCore * (1 - 0.1 * aeroCore));
  const tireManagement = concave(chassisPct * 0.65 + strategyPct * 0.35);
  const tireWear = Math.min(
    1,
    1 - tireManagement * (0.78 + 0.22 * (1 - aeroCore * 0.4)),
  );
  const reliabilityScore = Math.min(1, concave(relPct * 1.12));
  const pitStopTime = Math.min(
    1,
    1 - concave(strategyPct * 1.05 + relPct * 0.12),
  );
  const driverSkill = Math.min(1, concave(driverPct * 1.05));

  return {
    cornering,
    topSpeed,
    tireWear,
    reliabilityScore,
    pitStopTime,
    driverSkill,
  };
}

/**
 * Single scalar “pace potential” for a given track + weather (higher = faster car).
 */
export function paceFromPerformanceVector(
  v: PerformanceVector,
  bias: TrackBias,
  weather: WeatherBucket,
): number {
  const { aero: wa, power: wp } = paceWeightForTrack(bias);
  const wetPen =
    weather === 'wet' ? 0.22 : weather === 'mixed' ? 0.08 : 0;
  return (
    wa * v.cornering +
    wp * v.topSpeed +
    (1 - v.tireWear) * 0.12 +
    v.reliabilityScore * 0.06 +
    (1 - v.pitStopTime) * 0.1 +
    v.driverSkill * 0.2 +
    v.driverSkill * wetPen * 0.35 -
    wetPen * 0.12
  );
}
