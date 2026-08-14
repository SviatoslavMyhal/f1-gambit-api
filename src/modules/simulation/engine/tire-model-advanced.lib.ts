import type { TireCompound } from '../../setup/dto/tire-compound';
import { COMPOUND_PROFILE } from '../../setup/dto/tire-compound';

export type TireTemperatureTriplet = {
  innerC: number;
  middleC: number;
  outerC: number;
};

/**
 * Per-corner wear increment (relative units) — scales with thermal load and corner severity.
 */
export function wearIncrementPerCorner(
  baseLapWear: number,
  cornerThermalLoad: number,
  lateralG: number,
  trackDegMult: number,
): number {
  const load = 0.4 + cornerThermalLoad * 0.6 + Math.min(1.2, lateralG) * 0.25;
  return baseLapWear * load * (0.85 + trackDegMult * 0.15);
}

export function tireTemperaturesIMO(
  trackTempC: number,
  wearPercent: number,
  compound: TireCompound,
  overheatingRisk01: number,
): TireTemperatureTriplet {
  const p = COMPOUND_PROFILE[compound];
  const base = trackTempC + 25 + wearPercent * 0.35 + p.thermalSensitivity * 18;
  const spread = 4 + overheatingRisk01 * 12;
  return {
    innerC: base - spread * 0.35,
    middleC: base,
    outerC: base + spread * 0.45,
  };
}

export function overheatingFlag(
  temps: TireTemperatureTriplet,
  compound: TireCompound,
): boolean {
  const p = COMPOUND_PROFILE[compound];
  const limit = 115 + p.thermalSensitivity * 15;
  return temps.middleC > limit || temps.outerC > limit + 3;
}
