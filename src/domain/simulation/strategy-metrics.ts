import type { PerformanceVector, StrategyMetricsInput } from './types';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Optional sliders (0–1) layered on top of budget-derived performance.
 * Defaults at 0.5 = neutral (no change).
 */
export function applyStrategyMetricsToVector(
  v: PerformanceVector,
  m?: StrategyMetricsInput | null,
): PerformanceVector {
  if (!m) return v;
  const pitAgg = clamp01(m.pitAggression ?? 0.5);
  const pace = clamp01(m.paceFocus ?? 0.5);
  const cons = clamp01(m.consistency ?? 0.5);
  const pitDelta = (0.5 - pitAgg) * 0.16;
  const cornerDelta = (pace - 0.5) * 0.07;
  const tireDelta = (0.5 - pace) * 0.06;
  return {
    ...v,
    pitStopTime: clamp01(v.pitStopTime + pitDelta),
    cornering: clamp01(v.cornering + cornerDelta),
    topSpeed: clamp01(v.topSpeed + cornerDelta * 0.85),
    tireWear: clamp01(v.tireWear + tireDelta),
    driverSkill: clamp01(v.driverSkill + (cons - 0.5) * 0.05),
  };
}
