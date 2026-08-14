import type {
  ReferenceArchetype,
  ReferenceSessionKind,
  ReferenceSetupPreset,
} from './reference-setup.types';

/**
 * Static reference metrics per circuit — same track, comparable session *types*
 * (quali vs race trim). Not live F1 data; numeric targets for honest deltas.
 */
export type TrackReferenceEntry = {
  referenceId: string;
  /** Short API label */
  label: string;
  /** One-line headline for UI, e.g. “Reference: aggressive quali (benchmark)” */
  marketingLabel: string;
  archetype: ReferenceArchetype;
  sessionKind: ReferenceSessionKind;
  totalRaceSeconds: number;
  bestLapSeconds: number;
  sectorNormsSeconds: [number, number, number];
  /** Benchmark top speed on the longest straight (km/h) — for Δ vs player telemetry. */
  longestStraightTopSpeedKph: number;
  /** Suggested setup *style* (archetype), not a real driver’s garage sheet. */
  setupPreset: ReferenceSetupPreset;
};

const PRESET_QUALI: ReferenceSetupPreset = {
  frontWing: 9,
  rearWing: 8,
  suspensionStiffness: 8,
  brakeBias: 55,
  rideHeight: 4,
  differentialOnThrottle: 92,
};

const PRESET_RACE: ReferenceSetupPreset = {
  frontWing: 6,
  rearWing: 5,
  suspensionStiffness: 5,
  brakeBias: 60,
  rideHeight: 6,
  differentialOnThrottle: 72,
};

function mk(
  referenceId: 'quali_push' | 'race_manage',
  marketingLabel: string,
  archetype: ReferenceArchetype,
  sessionKind: ReferenceSessionKind,
  totalRaceSeconds: number,
  bestLapSeconds: number,
  sectorNormsSeconds: [number, number, number],
  longestStraightTopSpeedKph: number,
  setupPreset: ReferenceSetupPreset,
): TrackReferenceEntry {
  const label =
    referenceId === 'quali_push'
      ? 'Reference: aggressive quali (benchmark)'
      : 'Reference: race trim (benchmark)';
  return {
    referenceId,
    label,
    marketingLabel,
    archetype,
    sessionKind,
    totalRaceSeconds,
    bestLapSeconds,
    sectorNormsSeconds,
    longestStraightTopSpeedKph,
    setupPreset,
  };
}

/** References keyed by track slug. */
export const TRACK_REFERENCE_METRICS: Record<string, TrackReferenceEntry[]> = {
  monaco: [
    mk(
      'quali_push',
      'Quali — front-loaded (low-speed grip)',
      'quali_front_loaded',
      'quali',
      6500,
      71.2,
      [22.1, 23.4, 25.7],
      198,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — tyre saver (long stint)',
      'race_tyre_saver',
      'race',
      6680,
      72.5,
      [22.6, 24.0, 26.0],
      192,
      PRESET_RACE,
    ),
  ],
  monza: [
    mk(
      'quali_push',
      'Quali — minimum drag, straight speed',
      'quali_front_loaded',
      'quali',
      5300,
      79.5,
      [26.5, 26.2, 26.8],
      362,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — balanced wing, stint focus',
      'race_tyre_saver',
      'race',
      5420,
      80.4,
      [26.9, 26.6, 27.0],
      348,
      PRESET_RACE,
    ),
  ],
  silverstone: [
    mk(
      'quali_push',
      'Quali — high-speed aero',
      'quali_front_loaded',
      'quali',
      5600,
      87.0,
      [29.0, 29.2, 28.8],
      318,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — tyre management',
      'race_tyre_saver',
      'race',
      5750,
      88.1,
      [29.4, 29.5, 29.2],
      305,
      PRESET_RACE,
    ),
  ],
  spa: [
    mk(
      'quali_push',
      'Quali — sector 1 / straight focus',
      'quali_front_loaded',
      'quali',
      5450,
      104.2,
      [35.0, 34.8, 34.4],
      328,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — Eau Rouge rhythm, stint',
      'race_tyre_saver',
      'race',
      5580,
      105.5,
      [35.4, 35.2, 34.9],
      312,
      PRESET_RACE,
    ),
  ],
  suzuka: [
    mk(
      'quali_push',
      'Quali — one-lap balance',
      'quali_front_loaded',
      'quali',
      5500,
      89.8,
      [29.8, 30.0, 30.0],
      285,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — traction + deg',
      'race_tyre_saver',
      'race',
      5640,
      91.0,
      [30.2, 30.4, 30.4],
      272,
      PRESET_RACE,
    ),
  ],
  interlagos: [
    mk(
      'quali_push',
      'Quali — Senna S rhythm',
      'quali_front_loaded',
      'quali',
      5400,
      68.5,
      [22.5, 22.8, 23.2],
      298,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — altitude + traction',
      'race_tyre_saver',
      'race',
      5520,
      69.4,
      [22.8, 23.1, 23.5],
      288,
      PRESET_RACE,
    ),
  ],
  bahrain: [
    mk(
      'quali_push',
      'Quali — traction out of slow corners',
      'quali_front_loaded',
      'quali',
      5550,
      89.2,
      [29.5, 29.8, 29.9],
      308,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — rear deg management',
      'race_tyre_saver',
      'race',
      5680,
      90.3,
      [29.9, 30.1, 30.3],
      295,
      PRESET_RACE,
    ),
  ],
  singapore: [
    mk(
      'quali_push',
      'Quali — wall-to-wall quali',
      'quali_front_loaded',
      'quali',
      6800,
      100.2,
      [33.2, 33.5, 33.5],
      218,
      PRESET_QUALI,
    ),
    mk(
      'race_manage',
      'Race — safety car / heat',
      'race_tyre_saver',
      'race',
      6950,
      101.4,
      [33.6, 33.9, 33.9],
      208,
      PRESET_RACE,
    ),
  ],
};

export type ReferenceComparison = {
  referenceId: string;
  label: string;
  marketingLabel: string;
  archetype: ReferenceArchetype;
  sessionKind: ReferenceSessionKind;
  setupPreset: ReferenceSetupPreset;
  /** Positive = player slower (worse) than reference race total. */
  deltaTotalSeconds: number;
  /** Positive = player slower best lap than reference. */
  deltaBestLapSeconds: number;
  /** Sum of sector time deltas (player avg sectors − reference norms), same sign convention. */
  deltaSectorSumSeconds: number;
  referenceSectorNormsSeconds: [number, number, number];
  deltaSectorSeconds?: [number, number, number];
  /** Positive = player slower top speed on longest straight vs reference benchmark. */
  deltaTopSpeedStraightKph?: number;
  referenceTopSpeedKph: number;
};

export type ClosestReferenceMatch = {
  referenceId: string;
  marketingLabel: string;
  absDeltaTotalSeconds: number;
};

export function pickClosestReferenceMatch(
  rows: ReferenceComparison[],
): ClosestReferenceMatch | null {
  if (!rows.length) return null;
  let best = rows[0]!;
  let bestAbs = Math.abs(best.deltaTotalSeconds);
  for (const r of rows) {
    const a = Math.abs(r.deltaTotalSeconds);
    if (a < bestAbs) {
      best = r;
      bestAbs = a;
    }
  }
  return {
    referenceId: best.referenceId,
    marketingLabel: best.marketingLabel,
    absDeltaTotalSeconds: Math.round(bestAbs * 1000) / 1000,
  };
}

export function buildReferenceComparisons(
  trackSlug: string,
  playerTotalSeconds: number,
  playerBestLapSeconds: number,
  playerSectorAvg: [number, number, number] | null,
  compareToReferenceIds: string[],
  opts?: { playerTopSpeedStraightKph?: number | null },
): ReferenceComparison[] {
  const list = TRACK_REFERENCE_METRICS[trackSlug];
  if (!list?.length || !compareToReferenceIds.length) return [];

  const playerTop = opts?.playerTopSpeedStraightKph ?? null;

  const out: ReferenceComparison[] = [];
  for (const id of compareToReferenceIds) {
    const ref = list.find((r) => r.referenceId === id);
    if (!ref) continue;

    const refSectorSum =
      ref.sectorNormsSeconds[0] +
      ref.sectorNormsSeconds[1] +
      ref.sectorNormsSeconds[2];
    const playerSectorSum = playerSectorAvg
      ? playerSectorAvg[0] + playerSectorAvg[1] + playerSectorAvg[2]
      : null;

    const row: ReferenceComparison = {
      referenceId: ref.referenceId,
      label: ref.label,
      marketingLabel: ref.marketingLabel,
      archetype: ref.archetype,
      sessionKind: ref.sessionKind,
      setupPreset: ref.setupPreset,
      deltaTotalSeconds:
        Math.round((playerTotalSeconds - ref.totalRaceSeconds) * 1000) / 1000,
      deltaBestLapSeconds:
        Math.round((playerBestLapSeconds - ref.bestLapSeconds) * 1000) / 1000,
      deltaSectorSumSeconds:
        playerSectorSum != null
          ? Math.round((playerSectorSum - refSectorSum) * 1000) / 1000
          : 0,
      referenceSectorNormsSeconds: ref.sectorNormsSeconds,
      referenceTopSpeedKph: ref.longestStraightTopSpeedKph,
    };

    if (playerSectorAvg) {
      row.deltaSectorSeconds = [
        Math.round((playerSectorAvg[0] - ref.sectorNormsSeconds[0]) * 1000) / 1000,
        Math.round((playerSectorAvg[1] - ref.sectorNormsSeconds[1]) * 1000) / 1000,
        Math.round((playerSectorAvg[2] - ref.sectorNormsSeconds[2]) * 1000) / 1000,
      ];
    }

    if (playerTop != null) {
      row.deltaTopSpeedStraightKph =
        Math.round((playerTop - ref.longestStraightTopSpeedKph) * 10) / 10;
    }

    out.push(row);
  }
  return out;
}

export function listReferenceIdsForTrack(trackSlug: string): string[] {
  return (TRACK_REFERENCE_METRICS[trackSlug] ?? []).map((r) => r.referenceId);
}

export function averageRaceTotalForTrack(slug: string): number | undefined {
  const list = TRACK_REFERENCE_METRICS[slug];
  if (!list?.length) return undefined;
  return list.reduce((s, r) => s + r.totalRaceSeconds, 0) / list.length;
}
