import type { TireCompound } from '../../setup/dto/tire-compound';
import { COMPOUND_PROFILE } from '../../setup/dto/tire-compound';

/** Wear % → lap time penalty (seconds) — non-linear cliff past ~87% */
export function tireWearToDelta(wearPercent: number): number {
  const wear = wearPercent;
  if (wear < 50) return 0;
  if (wear < 70) return (wear - 50) * 0.008;
  if (wear < 85) return (wear - 70) * 0.035 + 0.16;
  return (wear - 85) * 0.18 + 0.685;
}

export function baseWearIncrement(
  compound: TireCompound,
  trackDegMult: number,
): number {
  const p = COMPOUND_PROFILE[compound];
  return p.degradationRate * trackDegMult * 100;
}

export function gripFromWear(wearPercent: number, compound: TireCompound): number {
  const [lo, hi] = COMPOUND_PROFILE[compound].optimalWindow;
  const w = wearPercent;
  if (w <= lo / 100) return 0.85 + (w / (lo / 100)) * 0.1;
  if (w <= hi / 100) return 0.95;
  return Math.max(0.2, 0.95 - (w - hi / 100) * 3);
}
