/**
 * Lightweight car dynamics — deterministic approximations (no full vehicle model).
 * G = lateral: v²/(r·g), longitudinal from throttle/brake demand.
 */

const G = 9.81;

export function speedMpsFromKph(kph: number): number {
  return (kph / 3.6);
}

/** Lateral acceleration magnitude (m/s²) from speed and corner radius (m). */
export function lateralAccelFromSpeedRadius(speedKph: number, radiusM: number): number {
  if (radiusM < 8) return 0;
  const v = speedMpsFromKph(speedKph);
  return (v * v) / radiusM;
}

/** Lateral G (dimensionless, ~1.0 = 1g). */
export function lateralGFromSpeedRadius(speedKph: number, radiusM: number): number {
  return lateralAccelFromSpeedRadius(speedKph, radiusM) / G;
}

/** Estimate corner radius (m) from reference lateral G and speed (used when radius unknown). */
export function radiusFromSpeedAndLateralG(speedKph: number, lateralG: number): number {
  if (lateralG < 0.05) return 500;
  const v = speedMpsFromKph(speedKph);
  const a = lateralG * G;
  return (v * v) / Math.max(a, 0.1);
}

/** Longitudinal G: throttle +ve, brake -ve (approximate). */
export function longitudinalG(throttle01: number, brake01: number): number {
  return throttle01 * 0.42 - brake01 * 1.05;
}

/**
 * Slip angle (deg) — tyre slip vs path; scales with lateral load and inversely with grip.
 */
export function slipAngleDeg(
  lateralG: number,
  grip01: number,
  deterministicJitter: number,
): number {
  const base = Math.min(9, lateralG * 4.2 * (1.15 - grip01 * 0.35));
  return Math.max(0, base + deterministicJitter * 0.35);
}

/** Brake disc temperature (°C) — rises with brake input, wear, lap count. */
export function brakeTemperatureC(
  brake01: number,
  tireWearPercent: number,
  lap: number,
  brakeBiasFront: number,
): number {
  const biasHeat = (brakeBiasFront - 58) * 0.4;
  return (
    120 +
    brake01 * 380 +
    tireWearPercent * 0.22 +
    lap * 0.35 +
    biasHeat
  );
}

/** Normalized track position 0–1 within lap from sector index 0..2 and t 0..1. */
export function trackPosition01(sectorIndex: number, tInSector: number): number {
  return Math.min(0.999, (sectorIndex + tInSector) / 3);
}
