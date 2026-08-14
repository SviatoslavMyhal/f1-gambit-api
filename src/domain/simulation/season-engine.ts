import { allocationToPerformanceVector } from './performance-vector';
import { REFERENCE_TOP_TEAM_ALLOCATION } from './budget-mapper';
import { simulateRaceWithTimeline } from './race-engine';
import { trackBiasForRace } from './track-profile';
import type {
  BudgetInput,
  F1MetricsSnapshot,
  RaceEvent,
  RaceOutcome,
  RedBullComparison,
  SeasonEngineInput,
  SimulationResultPayload,
  StandingRow,
} from './types';
import { createRng } from './rng';

export const SIM_VERSION = 3;
export const RACES_PER_SEASON = 5;

function buildMetrics(
  races: RaceOutcome[],
  paceDeltas: number[],
  metricsRng: () => number,
): F1MetricsSnapshot {
  const dnfs = races.filter((r) => r.playerDnf).length;
  const finishes = races.filter((r) => !r.playerDnf);
  const avgPos =
    finishes.length === 0
      ? 20
      : finishes.reduce((s, r) => s + r.playerPosition, 0) / finishes.length;
  const paceDeltaVsLeader =
    paceDeltas.length === 0
      ? 0
      : paceDeltas.reduce((a, b) => a + b, 0) / paceDeltas.length;
  const qualDelta = 35 + (metricsRng() - 0.5) * 80;
  const consistency =
    finishes.length < 2
      ? 0.5
      : 1 -
        Math.min(
          1,
          stddev(finishes.map((r) => r.playerPosition)) / 6,
        );
  return {
    dnfRate: dnfs / Math.max(1, races.length),
    avgFinishingPosition: avgPos,
    qualifyingVsRaceDeltaMs: qualDelta,
    paceDeltaVsLeaderMs: paceDeltaVsLeader,
    consistencyScore: Math.max(0, Math.min(1, consistency)),
  };
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const v =
    values.reduce((s, x) => s + (x - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

function toSeasonRaceEvent(
  raceIndex: number,
  e: {
    lap: number;
    type: 'overtake' | 'pit' | 'dnf' | 'safety_car';
    actorId?: string;
    targetId?: string;
    detail?: string;
  },
): RaceEvent {
  const subject =
    e.actorId === 'player'
      ? 'player'
      : e.actorId === 'baseline'
        ? 'baseline'
        : 'rival';
  const type =
    e.type === 'pit'
      ? 'pit'
      : e.type === 'overtake'
        ? 'overtake'
        : e.type === 'dnf'
          ? 'dnf'
          : 'safety_car';
  return {
    raceIndex,
    lap: e.lap,
    type,
    subject,
    actorId: e.actorId,
    detail: e.detail,
  };
}

export function simulateSeason(input: SeasonEngineInput): SimulationResultPayload {
  const seed = input.seed;
  const baselineBudget =
    input.baselineBudget ?? REFERENCE_TOP_TEAM_ALLOCATION;
  const baselineLabel = input.baselineLabel ?? 'Reference team';
  const playerPerformanceVector = allocationToPerformanceVector(input.budget);

  const races: RaceOutcome[] = [];
  const events: RaceEvent[] = [];
  const paceDeltas: number[] = [];

  let playerConstructorPoints = 0;
  let baselineConstructorPoints = 0;

  for (let raceIndex = 0; raceIndex < RACES_PER_SEASON; raceIndex++) {
    const bias = trackBiasForRace(raceIndex);
    const sr = simulateRaceWithTimeline({
      seed,
      seasonYear: input.seasonYear,
      raceIndex,
      trackBias: bias,
      playerBudget: input.budget,
      baselineBudget,
      playerStrategyMetrics: input.strategyMetrics,
    });

    playerConstructorPoints += sr.playerPoints;
    baselineConstructorPoints += sr.baselinePoints;

    const baseMs = 92_000;
    if (sr.playerRaceTimeMs > 0) {
      paceDeltas.push(sr.playerRaceTimeMs - (baseMs - 600));
    }

    races.push({
      raceId: sr.raceId,
      raceIndex,
      trackBias: bias,
      weather: sr.weather,
      playerRaceTimeMs: sr.playerRaceTimeMs,
      baselineRaceTimeMs: sr.baselineRaceTimeMs,
      playerPosition: sr.playerPosition,
      baselinePosition: sr.baselinePosition,
      playerDnf: sr.playerDnf,
      baselineDnf: sr.baselineDnf,
      playerPoints: sr.playerPoints,
      baselinePoints: sr.baselinePoints,
      timeline: sr.timeline,
    });

    for (const ev of sr.timeline.events) {
      events.push(toSeasonRaceEvent(raceIndex, ev));
    }
  }

  const playerStandings: StandingRow[] = [
    { name: 'You', points: playerConstructorPoints },
  ];
  const constructorStandings: StandingRow[] = [
    { name: 'You', points: playerConstructorPoints },
    { name: baselineLabel, points: baselineConstructorPoints },
  ].sort((a, b) => b.points - a.points);

  const metrics = buildMetrics(
    races,
    paceDeltas,
    createRng(`${seed}:metrics`),
  );

  const comparison: RedBullComparison | undefined = input.compareConstructorRef
    ? {
        constructorRef: input.compareConstructorRef,
        simulatedBaselinePoints: baselineConstructorPoints,
        playerConstructorPoints,
        summary:
          playerConstructorPoints >= baselineConstructorPoints
            ? `Your allocation outscored ${baselineLabel} in this mini-season.`
            : `${baselineLabel} edged your strategy over five races — tune budget and sliders.`,
      }
    : undefined;

  return {
    simVersion: SIM_VERSION,
    seed,
    seasonYear: input.seasonYear,
    playerPerformanceVector,
    races,
    driverStandings: playerStandings,
    constructorStandings,
    totals: {
      playerConstructorPoints,
      baselineConstructorPoints,
    },
    events,
    metrics,
    comparison,
  };
}
