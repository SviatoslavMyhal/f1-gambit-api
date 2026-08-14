import type { LapWithSectors } from './laps-map.util';

/** 3 rows (S1–S3) × one column per lap in sorted lap order. */
export type SectorHeatmapCell = 'pb' | 'sb' | 'improved' | 'none';

const DEFAULT_EPS = 1e-4;

function approxEq(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}

function byLap(
  rows: LapWithSectors[],
): Map<number, [number, number, number] | undefined> {
  const m = new Map<number, [number, number, number] | undefined>();
  for (const r of rows) {
    m.set(r.lap, r.sectors);
  }
  return m;
}

/**
 * Per-player sector heatmap for multiplayer results.
 *
 * **PB** — sector time equals this player's personal best on that sector (all laps).
 * **SB** — on this lap+dimension, both drivers have a sector time and this player ties
 *          the faster of the two (same lap, same sector); not PB.
 * **improved** — strictly faster than this player's previous lap's same sector (lap-to-lap);
 *                 not PB/SB.
 * **none** — everything else or missing sector data for that cell.
 *
 * Classification is computed independently for sectors 0,1,2 (never copied across rows).
 */
export function buildSectorHeatmap(
  selfLaps: LapWithSectors[],
  opponentLaps: LapWithSectors[],
  eps = DEFAULT_EPS,
): SectorHeatmapCell[][] {
  const selfByLap = byLap(selfLaps);
  const oppByLap = byLap(opponentLaps);
  const laps = [...new Set([...selfByLap.keys(), ...oppByLap.keys()])].sort(
    (a, b) => a - b,
  );

  const pb: [number, number, number] = [Infinity, Infinity, Infinity];
  for (const L of laps) {
    const s = selfByLap.get(L);
    if (!s) continue;
    for (let i = 0; i < 3; i++) {
      const t = s[i]!;
      if (Number.isFinite(t) && t < pb[i]!) pb[i] = t;
    }
  }

  const grid: SectorHeatmapCell[][] = [[], [], []];
  const prevSelfSector: [number | null, number | null, number | null] = [
    null,
    null,
    null,
  ];

  for (let col = 0; col < laps.length; col++) {
    const L = laps[col]!;
    const selfS = selfByLap.get(L);
    const oppS = oppByLap.get(L);

    for (let i = 0; i < 3; i++) {
      const tSelf = selfS?.[i];
      if (tSelf === undefined || !Number.isFinite(tSelf)) {
        grid[i]![col] = 'none';
        continue;
      }

      const tOpp = oppS?.[i];
      const bothHave =
        tOpp !== undefined &&
        Number.isFinite(tOpp) &&
        selfS !== undefined &&
        oppS !== undefined;

      const sessionLapSectorBest =
        bothHave && tOpp !== undefined ? Math.min(tSelf, tOpp) : null;

      const hasPb = Number.isFinite(pb[i]);
      const isPb =
        hasPb && pb[i] !== Infinity && approxEq(tSelf, pb[i]!, eps);

      const isSb =
        !isPb &&
        bothHave &&
        sessionLapSectorBest !== null &&
        approxEq(tSelf, sessionLapSectorBest, eps);

      const prev = prevSelfSector[i];
      const isImproved =
        !isPb && !isSb && prev !== null && tSelf < prev - eps;

      let cell: SectorHeatmapCell = 'none';
      if (isPb) cell = 'pb';
      else if (isSb) cell = 'sb';
      else if (isImproved) cell = 'improved';

      grid[i]![col] = cell;
      prevSelfSector[i] = tSelf;
    }
  }

  return grid;
}
