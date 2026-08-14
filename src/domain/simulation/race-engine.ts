import type {
  BudgetInput,
  RaceTimelinePayload,
  StrategyMetricsInput,
  TrackBias,
  WeatherBucket,
} from './types';
import type { PerformanceVector } from './types';
import { allocationToPerformanceVector, paceFromPerformanceVector } from './performance-vector';
import { applyStrategyMetricsToVector } from './strategy-metrics';
import { pointsForPosition } from './f1-points';
import { createRng, gaussian } from './rng';
import { paceWeightForTrack } from './track-profile';

export const RACE_LAPS = 50;
/** Few checkpoints — enough for charts; ~10 × 20 ranks per race (fast). */
export const SNAPSHOT_LAPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export type SingleRaceSimulation = {
  raceId: string;
  raceIndex: number;
  trackBias: TrackBias;
  weather: WeatherBucket;
  playerPosition: number;
  baselinePosition: number;
  playerDnf: boolean;
  baselineDnf: boolean;
  playerPoints: number;
  baselinePoints: number;
  playerRaceTimeMs: number;
  baselineRaceTimeMs: number;
  timeline: RaceTimelinePayload;
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function weatherForRace(rng: () => number): WeatherBucket {
  const r = rng();
  if (r < 0.78) return 'dry';
  if (r < 0.92) return 'mixed';
  return 'wet';
}

/** Returns lap index when DNF occurs, or null if the car finishes. */
function rollDnfLap(reliability: number, rng: () => number): number | null {
  const p = Math.min(0.13, 0.012 + (1 - reliability) * 0.15);
  if (rng() >= p) return null;
  return 8 + Math.floor(rng() * 42);
}

/** Midfield / backmarker — slightly below player & reference on average so top-10 points exist. */
function fieldVector(rng: () => number): PerformanceVector {
  return {
    cornering: clamp01(0.4 + (rng() - 0.5) * 0.22),
    topSpeed: clamp01(0.4 + (rng() - 0.5) * 0.22),
    tireWear: clamp01(0.32 + rng() * 0.38),
    reliabilityScore: clamp01(0.45 + rng() * 0.35),
    pitStopTime: clamp01(0.26 + rng() * 0.34),
    driverSkill: clamp01(0.4 + (rng() - 0.5) * 0.2),
  };
}

function lapScore(
  v: PerformanceVector,
  lap: number,
  bias: TrackBias,
  weather: WeatherBucket,
  rng: () => number,
  id: string,
): number {
  const core = paceFromPerformanceVector(v, bias, weather);
  const tireLoss = v.tireWear * Math.pow(lap / RACE_LAPS, 1.18) * 0.42;
  const { aero: wa, power: wp } = paceWeightForTrack(bias);
  const micro = gaussian(rng) * 0.028 + (rng() - 0.5) * 0.012;
  let score =
    core -
    tireLoss +
    micro +
    wa * v.cornering * 0.02 * (lap / RACE_LAPS) +
    wp * v.topSpeed * 0.015 * (lap / RACE_LAPS);

  if (id === 'player' || id === 'baseline') {
    score += 0.08;
  } else if (id.startsWith('field_')) {
    score *= 0.78;
  }
  return score;
}

function rankAtLap(
  ids: string[],
  vectors: Map<string, PerformanceVector>,
  lap: number,
  bias: TrackBias,
  weather: WeatherBucket,
  dnfAt: Map<string, number | null>,
  rng: () => number,
): Map<string, number> {
  const scores: { id: string; score: number }[] = [];
  for (const id of ids) {
    const dnfLap = dnfAt.get(id);
    if (dnfLap !== null && dnfLap !== undefined && lap >= dnfLap) {
      scores.push({ id, score: -1e9 });
    } else {
      const v = vectors.get(id)!;
      scores.push({
        id,
        score: lapScore(v, lap, bias, weather, rng, id),
      });
    }
  }
  scores.sort((a, b) => b.score - a.score);
  const rank = new Map<string, number>();
  scores.forEach((s, i) => rank.set(s.id, i + 1));
  return rank;
}

export function simulateRaceWithTimeline(input: {
  seed: string;
  seasonYear: number;
  raceIndex: number;
  trackBias: TrackBias;
  playerBudget: BudgetInput;
  baselineBudget: BudgetInput;
  playerStrategyMetrics?: StrategyMetricsInput | null;
}): SingleRaceSimulation {
  const rng = createRng(`${input.seed}:race:${input.raceIndex}`);
  const weather = weatherForRace(rng);

  const vPlayer = applyStrategyMetricsToVector(
    allocationToPerformanceVector(input.playerBudget),
    input.playerStrategyMetrics,
  );
  const vBase = allocationToPerformanceVector(input.baselineBudget);

  const ids: string[] = ['player', 'baseline'];
  const vectors = new Map<string, PerformanceVector>();
  vectors.set('player', vPlayer);
  vectors.set('baseline', vBase);

  for (let i = 0; i < 18; i++) {
    const id = `field_${i}`;
    ids.push(id);
    vectors.set(
      id,
      fieldVector(createRng(`${input.seed}:field:${input.raceIndex}:${i}`)),
    );
  }

  const dnfAt = new Map<string, number | null>();
  dnfAt.set('player', rollDnfLap(vPlayer.reliabilityScore, rng));
  dnfAt.set('baseline', rollDnfLap(vBase.reliabilityScore, rng));
  for (let i = 0; i < 18; i++) {
    const id = `field_${i}`;
    dnfAt.set(id, rollDnfLap(vectors.get(id)!.reliabilityScore, rng));
  }

  const playerDnfLap = dnfAt.get('player');
  const baselineDnfLap = dnfAt.get('baseline');
  const playerDnf = playerDnfLap !== null && playerDnfLap !== undefined;
  const baselineDnf =
    baselineDnfLap !== null && baselineDnfLap !== undefined;

  const checkpoints: RaceTimelinePayload['checkpoints'] = [];
  const positionSamples: RaceTimelinePayload['positionSamples'] = [];
  const timelineEvents: RaceTimelinePayload['events'] = [];
  let prevPlayerPos: number | null = null;
  let prevBasePos: number | null = null;

  for (const lap of SNAPSHOT_LAPS) {
    const snapRng = createRng(`${input.seed}:snap:${input.raceIndex}:${lap}`);
    const rank = rankAtLap(
      ids,
      vectors,
      lap,
      input.trackBias,
      weather,
      dnfAt,
      snapRng,
    );
    const positions = ids.map((id) => ({
      driverId: id,
      position: rank.get(id) ?? 20,
    }));
    checkpoints.push({ lap, positions });
    for (const p of positions) {
      positionSamples.push({ lap, driverId: p.driverId, position: p.position });
    }

    const pp = rank.get('player') ?? 20;
    const bp = rank.get('baseline') ?? 20;
    if (prevPlayerPos !== null && prevBasePos !== null) {
      const wasAhead = prevPlayerPos < prevBasePos;
      const nowAhead = pp < bp;
      if (wasAhead !== nowAhead) {
        timelineEvents.push({
          lap,
          type: 'overtake',
          actorId: nowAhead ? 'player' : 'baseline',
          targetId: nowAhead ? 'baseline' : 'player',
          detail: 'On-track position swap',
        });
      }
    }
    prevPlayerPos = pp;
    prevBasePos = bp;
  }

  if (playerDnfLap != null) {
    timelineEvents.push({
      lap: playerDnfLap,
      type: 'dnf',
      actorId: 'player',
      detail: 'Mechanical / power unit',
    });
  }
  if (baselineDnfLap != null) {
    timelineEvents.push({
      lap: baselineDnfLap,
      type: 'dnf',
      actorId: 'baseline',
      detail: 'Mechanical / power unit',
    });
  }

  if (rng() < 0.14) {
    timelineEvents.push({
      lap: 12 + Math.floor(rng() * 28),
      type: 'pit',
      actorId: rng() < 0.5 ? 'player' : 'baseline',
      detail: 'Tire stop',
    });
  }
  if (rng() < 0.06) {
    timelineEvents.push({
      lap: 8 + Math.floor(rng() * 35),
      type: 'safety_car',
      detail: 'Pack compression',
    });
  }

  timelineEvents.sort((a, b) => a.lap - b.lap);

  const finalRank = rankAtLap(
    ids,
    vectors,
    RACE_LAPS,
    input.trackBias,
    weather,
    dnfAt,
    createRng(`${input.seed}:final:${input.raceIndex}`),
  );
  const playerPosition = finalRank.get('player') ?? 20;
  const baselinePosition = finalRank.get('baseline') ?? 20;

  const playerPts = playerDnf ? 0 : pointsForPosition(playerPosition);
  const baselinePts = baselineDnf ? 0 : pointsForPosition(baselinePosition);

  const baseMs = 92_000 + Math.floor(rng() * 900);
  const playerRaceTimeMs = playerDnf
    ? -1
    : baseMs + (playerPosition - 1) * 85 + Math.floor(rng() * 400);
  const baselineRaceTimeMs = baselineDnf
    ? -1
    : baseMs + (baselinePosition - 1) * 85 + Math.floor(rng() * 400);

  const raceId = `s${input.seasonYear}-r${input.raceIndex + 1}`;

  const timeline: RaceTimelinePayload = {
    totalLaps: RACE_LAPS,
    checkpoints,
    positionSamples,
    events: timelineEvents,
  };

  return {
    raceId,
    raceIndex: input.raceIndex,
    trackBias: input.trackBias,
    weather,
    playerPosition,
    baselinePosition,
    playerDnf,
    baselineDnf,
    playerPoints: playerPts,
    baselinePoints: baselinePts,
    playerRaceTimeMs,
    baselineRaceTimeMs,
    timeline,
  };
}
