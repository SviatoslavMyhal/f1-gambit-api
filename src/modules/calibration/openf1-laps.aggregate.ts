import type {
  BaselineAggregatesJson,
  NumericSeriesStats,
  OpenF1LapRow,
} from './calibration.types';

const MIN_LAP_S = 45;
const MAX_LAP_S = 240;
const MIN_SECTOR_S = 12;
const MAX_SECTOR_S = 120;

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? 0;
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return a + (b - a) * (idx - lo);
}

export function statsFromValues(values: number[]): NumericSeriesStats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: sum / sorted.length,
    median: percentile(sorted, 0.5),
    q1: percentile(sorted, 0.25),
    q3: percentile(sorted, 0.75),
  };
}

export type ParsedLapSample = {
  lap: number;
  lapDuration: number;
  s1: number;
  s2: number;
  s3: number;
};

/**
 * Normalizes OpenF1 lap rows into clean samples. Skips lap 1, pit-out laps,
 * and rows with missing or absurd timings.
 */
export function parseOpenF1LapRows(
  rows: OpenF1LapRow[],
): { samples: ParsedLapSample[]; excluded: number } {
  const samples: ParsedLapSample[] = [];
  let excluded = 0;

  for (const r of rows) {
    const lap = r.lap_number;
    if (lap == null || lap < 2) {
      excluded++;
      continue;
    }
    if (r.is_pit_out_lap === true) {
      excluded++;
      continue;
    }
    const ld = r.lap_duration;
    const s1 = r.duration_sector_1;
    const s2 = r.duration_sector_2;
    const s3 = r.duration_sector_3;
    if (
      ld == null ||
      s1 == null ||
      s2 == null ||
      s3 == null ||
      !Number.isFinite(ld) ||
      !Number.isFinite(s1) ||
      !Number.isFinite(s2) ||
      !Number.isFinite(s3)
    ) {
      excluded++;
      continue;
    }
    if (
      ld < MIN_LAP_S ||
      ld > MAX_LAP_S ||
      s1 < MIN_SECTOR_S ||
      s1 > MAX_SECTOR_S ||
      s2 < MIN_SECTOR_S ||
      s2 > MAX_SECTOR_S ||
      s3 < MIN_SECTOR_S ||
      s3 > MAX_SECTOR_S
    ) {
      excluded++;
      continue;
    }
    const sumS = s1 + s2 + s3;
    if (Math.abs(sumS - ld) > 2.5) {
      excluded++;
      continue;
    }
    samples.push({ lap, lapDuration: ld, s1, s2, s3 });
  }

  return { samples, excluded };
}

export function buildAggregatesFromSamples(
  samples: ParsedLapSample[],
  excludedSampleCount: number,
  meta?: Pick<
    BaselineAggregatesJson,
    'meetingName' | 'circuitShortName' | 'year'
  >,
): BaselineAggregatesJson | null {
  if (!samples.length) return null;

  const lapSeconds = statsFromValues(samples.map((s) => s.lapDuration));
  const sector1Seconds = statsFromValues(samples.map((s) => s.s1));
  const sector2Seconds = statsFromValues(samples.map((s) => s.s2));
  const sector3Seconds = statsFromValues(samples.map((s) => s.s3));
  if (!lapSeconds || !sector1Seconds || !sector2Seconds || !sector3Seconds) {
    return null;
  }

  return {
    lapSeconds,
    sector1Seconds,
    sector2Seconds,
    sector3Seconds,
    excludedSampleCount,
    ...(meta?.meetingName !== undefined ? { meetingName: meta.meetingName } : {}),
    ...(meta?.circuitShortName !== undefined
      ? { circuitShortName: meta.circuitShortName }
      : {}),
    ...(meta?.year !== undefined ? { year: meta.year } : {}),
  };
}

export function aggregateOpenF1LapRows(
  rows: OpenF1LapRow[],
  meta?: { meetingName?: string; circuitShortName?: string; year?: number },
): BaselineAggregatesJson | null {
  const { samples, excluded } = parseOpenF1LapRows(rows);
  return buildAggregatesFromSamples(samples, excluded, meta);
}
