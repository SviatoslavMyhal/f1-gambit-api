import { SeededRandom } from './seeded-random';

/** F1-style points for positions 1–10 (2020s rules); 11+ = 0. */
const POINTS_TABLE: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

export function pointsForPosition(position: number): number {
  if (position < 1) return 0;
  return POINTS_TABLE[position] ?? 0;
}

export type RaceFinisher = {
  position: number;
  label: string;
  totalRaceTimeSeconds: number;
  isPlayer: boolean;
};

export type GridRaceOutcome = {
  finalPosition: number;
  points: number;
  gridSize: number;
  playerPosition: number;
  /** Competitive grid ranking — not a solo demo placeholder. */
  resultMode: 'grid';
  raceTopFinishers: RaceFinisher[];
};

function hashSlugBias(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000) / 1_000_000 - 0.001;
}

/**
 * Rank the player against (gridSize - 1) AI rivals with independent total race times.
 * Rivals are drawn around a **field baseline** (per-track reference race time when available),
 * so faster player simulations rank higher than slower ones. If no baseline exists, the
 * player’s own total time is used as the field anchor (relative grid only).
 */
export function computeGridRaceResult(
  playerTotalSeconds: number,
  opts: {
    gridSize: number;
    seedNumber: number;
    trackSlug: string;
    /** When set (e.g. from track reference metrics), rival times scale from this — not from player. */
    fieldBaselineSeconds?: number;
  },
): GridRaceOutcome {
  const gridSize = Math.max(2, Math.min(22, Math.floor(opts.gridSize)));
  const rivals = gridSize - 1;
  const slugBias = hashSlugBias(opts.trackSlug);
  const fieldBase = opts.fieldBaselineSeconds ?? playerTotalSeconds;

  type Row = { label: string; t: number; isPlayer: boolean };
  const rows: Row[] = [
    { label: 'You', t: playerTotalSeconds, isPlayer: true },
  ];

  for (let i = 0; i < rivals; i++) {
    const subSeed = (opts.seedNumber ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0;
    const r = new SeededRandom(subSeed);
    const delta =
      r.gaussian(0, 0.0075) +
      r.gaussian(0, 0.004) +
      slugBias +
      ((i % 7) - 3) * 0.0004;
    const clamped = Math.max(-0.038, Math.min(0.042, delta));
    const t = fieldBase * (1 + clamped);
    rows.push({
      label: `Rival ${String(i + 1).padStart(2, '0')}`,
      t,
      isPlayer: false,
    });
  }

  rows.sort((a, b) => {
    if (a.t === b.t) return a.isPlayer ? -1 : 1;
    return a.t - b.t;
  });

  const playerPosition = rows.findIndex((x) => x.isPlayer) + 1;
  const points = pointsForPosition(playerPosition);

  const ordered: RaceFinisher[] = rows.map((row, idx) => ({
    position: idx + 1,
    label: row.label,
    totalRaceTimeSeconds: Math.round(row.t * 1000) / 1000,
    isPlayer: row.isPlayer,
  }));

  const raceTopFinishers = ordered.slice(0, 5);

  return {
    finalPosition: playerPosition,
    points,
    gridSize,
    playerPosition,
    resultMode: 'grid',
    raceTopFinishers,
  };
}
