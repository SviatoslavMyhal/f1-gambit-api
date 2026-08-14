/** Limits so calibration cannot explode lap times if medians mis-match. */
export const SECTOR_SCALE_MIN = 0.88;
export const SECTOR_SCALE_MAX = 1.12;

export function clampSectorScale(x: number): number {
  return Math.min(SECTOR_SCALE_MAX, Math.max(SECTOR_SCALE_MIN, x));
}

/**
 * Per-sector scale = OpenF1 median / sim median, clamped.
 * If a sim sector median is degenerate, falls back to uniform lap ratio (clamped).
 */
export function computeSectorScales(
  openf1MedianLap: number,
  openf1MedianSectors: [number, number, number],
  simMedianLap: number,
  simMedianSectors: [number, number, number],
): [number, number, number] {
  if (simMedianLap <= 1e-6 || openf1MedianLap <= 0) {
    return [1, 1, 1];
  }
  const uniform = clampSectorScale(openf1MedianLap / simMedianLap);
  const out: [number, number, number] = [1, 1, 1];
  for (let i = 0; i < 3; i++) {
    const ss = simMedianSectors[i] ?? 0;
    const os = openf1MedianSectors[i] ?? 0;
    if (ss > 1e-6 && os > 0) {
      out[i] = clampSectorScale(os / ss);
    } else {
      out[i] = uniform;
    }
  }
  return out;
}
