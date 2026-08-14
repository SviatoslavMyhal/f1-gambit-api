import type { SessionTelemetry } from '../telemetry/telemetry.types';

/** Per-lap data for map scrubbers: total time + optional S1–S3 (seconds). */
export type LapWithSectors = {
  lap: number;
  timeSeconds: number;
  sectors?: [number, number, number];
};

/**
 * Aligns lapTimes with sectorSplits by array index (engine emits one row per lap).
 */
export function lapsWithSectorsFromTelemetry(
  telemetry: SessionTelemetry,
): LapWithSectors[] {
  const rows: LapWithSectors[] = [];
  const n = Math.min(telemetry.lapTimes.length, telemetry.sectorSplits.length);
  for (let i = 0; i < n; i++) {
    const lt = telemetry.lapTimes[i]!;
    const ss = telemetry.sectorSplits[i]!;
    rows.push({
      lap: lt.lap,
      timeSeconds: lt.timeSeconds,
      sectors: [ss.sector1, ss.sector2, ss.sector3],
    });
  }
  for (let i = n; i < telemetry.lapTimes.length; i++) {
    const lt = telemetry.lapTimes[i]!;
    rows.push({ lap: lt.lap, timeSeconds: lt.timeSeconds });
  }
  return rows;
}
