/** Pure domain types — no Nest/TypeORM imports. */

/** Normalized 0–1 attributes from budget mapping (see performance-vector.ts). */
export type PerformanceVector = {
  cornering: number;
  topSpeed: number;
  tireWear: number;
  reliabilityScore: number;
  pitStopTime: number;
  driverSkill: number;
};

export type BudgetInput = {
  aero: number;
  powerUnit: number;
  chassis: number;
  driverMarket: number;
  reliability: number;
  operations: number;
};

export type CarPerformanceProfile = {
  aeroEfficiency: number;
  straightLineSpeed: number;
  tireDegradation: number;
  reliability: number;
};

export type DriverProfile = {
  pace: number;
  consistency: number;
  overtakingSkill: number;
  wetPerformance: number;
};

export type StrategyProfile = {
  pitEfficiency: number;
};

export type TrackBias = 'downforce' | 'power' | 'balanced';

export type WeatherBucket = 'dry' | 'mixed' | 'wet';

export type RaceEventType =
  | 'overtake'
  | 'pit'
  | 'pit_loss'
  | 'dnf'
  | 'safety_car'
  | 'qualifying_delta';

export type RaceEvent = {
  raceIndex: number;
  lap: number;
  type: RaceEventType;
  subject?: 'player' | 'baseline' | 'rival';
  actorId?: string;
  detail?: string;
  impactMs?: number;
};

/** Per-race structured output for charts / replay (checkpoint-based, not full telemetry). */
export type RaceTimelinePayload = {
  totalLaps: number;
  checkpoints: {
    lap: number;
    positions: { driverId: string; position: number }[];
  }[];
  /** Flattened samples for Recharts / position-over-time. */
  positionSamples: { lap: number; driverId: string; position: number }[];
  events: {
    lap: number;
    type: 'overtake' | 'pit' | 'dnf' | 'safety_car';
    actorId?: string;
    targetId?: string;
    detail?: string;
  }[];
};

export type RaceOutcome = {
  raceId: string;
  raceIndex: number;
  trackBias: TrackBias;
  weather: WeatherBucket;
  playerRaceTimeMs: number;
  baselineRaceTimeMs: number;
  playerPosition: number;
  baselinePosition: number;
  playerDnf: boolean;
  baselineDnf: boolean;
  playerPoints: number;
  baselinePoints: number;
  timeline: RaceTimelinePayload;
};

export type StandingRow = {
  name: string;
  points: number;
};

export type F1MetricsSnapshot = {
  dnfRate: number;
  avgFinishingPosition: number;
  qualifyingVsRaceDeltaMs: number;
  paceDeltaVsLeaderMs: number;
  consistencyScore: number;
};

export type RedBullComparison = {
  constructorRef: string;
  realWorldConstructorPoints?: number;
  realWorldPosition?: number;
  simulatedBaselinePoints: number;
  playerConstructorPoints: number;
  summary: string;
};

export type SimulationResultPayload = {
  simVersion: number;
  seed: string;
  seasonYear: number;
  playerPerformanceVector: PerformanceVector;
  races: RaceOutcome[];
  driverStandings: StandingRow[];
  /** Sorted by points desc — includes player + reference baseline “team”. */
  constructorStandings: StandingRow[];
  totals: {
    playerConstructorPoints: number;
    baselineConstructorPoints: number;
  };
  /** Season-level feed (aggregated from race timelines). */
  events: RaceEvent[];
  metrics: F1MetricsSnapshot;
  comparison?: RedBullComparison;
};

/** Optional 0–1 sliders; 0.5 = neutral (see strategy-metrics.ts). */
export type StrategyMetricsInput = {
  pitAggression?: number;
  paceFocus?: number;
  consistency?: number;
};

export type SeasonEngineInput = {
  budget: BudgetInput;
  seasonYear: number;
  seed: string;
  /** e.g. red_bull — used only for labeling + optional API lookup */
  compareConstructorRef?: string;
  /** AI opponent baseline budget (defaults to reference top team). */
  baselineBudget?: BudgetInput;
  /** Label for the opponent row in standings / UI. */
  baselineLabel?: string;
  strategyMetrics?: StrategyMetricsInput | null;
};
