import type { TireCompound } from '../setup/dto/tire-compound';

export type LapTimeData = {
  lap: number;
  timeSeconds: number;
  delta: number;
  isPersonalBest: boolean;
  compound: TireCompound;
  tireAge: number;
  fuelCorrected: number;
};

/** Per-lap tire + thermal model (extended). */
export type TireTelemetry = {
  lap: number;
  compound: TireCompound;
  wearPercent: number;
  grainPercent: number;
  overheatingRisk: number;
  gripLevel: number;
  projectedFailureLap: number | null;
  /** Δ wear vs lap start (percentage points). */
  tireWearPerLap?: number;
  /** Mean incremental wear across sampled corners this lap. */
  tireWearPerCornerAvg?: number;
  tireTemperature?: {
    innerC: number;
    middleC: number;
    outerC: number;
  };
  /** True when middle band exceeds compound thermal limit. */
  overheating?: boolean;
};

export type SpeedSample = {
  corner: number;
  entrySpeedKph: number;
  midCornerSpeedKph: number;
  exitSpeedKph: number;
  throttlePercent: number;
  brakePercent: number;
  lateralG?: number;
  longitudinalG?: number;
  slipAngleDeg?: number;
  brakeTemperatureC?: number;
};

export type SectorSplit = {
  lap: number;
  sector1: number;
  sector2: number;
  sector3: number;
  sector1Delta: number;
  sector2Delta: number;
  sector3Delta: number;
};

export type RaceEventTelemetry = {
  lap: number;
  type:
    | 'PIT_STOP'
    | 'OVERTAKE'
    | 'LOCK_UP'
    | 'TIRE_OVERHEAT'
    | 'SAFETY_CAR'
    | 'DRS_TRAIN'
    | 'FASTEST_LAP'
    | 'WHEEL_SPIN'
    | 'DIRTY_AIR_LOSS'
    | 'DRS_ACTIVATION';
  description: string;
  impactSeconds: number;
  data: Record<string, unknown>;
};

export type StrategySnapshot = {
  stint: number;
  startLap: number;
  endLap: number;
  compound: TireCompound;
  pitLap: number | null;
  pitWindowOptimal: [number, number];
  undercut: boolean;
  overcut: boolean;
};

export type DriverMetricsSnapshot = {
  brakingAggression: number;
  throttleSmoothness: number;
  consistencyScore: number;
  mistakeProbability: number;
};

/** Per-lap engineering summary (OpenF1-inspired sector structure). */
export type AdvancedLapTelemetry = {
  lap: number;
  sectors: {
    sector: 1 | 2 | 3;
    timeSeconds: number;
    deltaVsBest: number;
    miniSectorTimes?: number[];
  }[];
  sectorDeltaVsBest: [number, number, number];
  miniSectorTimes: [number, number, number];
  topSpeedPerStraight: number;
  accelerationZones: number;
  tireWearPerLap: number;
  tireWearPerCornerAvg: number;
  tireTemperature: { innerC: number; middleC: number; outerC: number };
  tireOverheating: boolean;
  driverMetrics: DriverMetricsSnapshot;
};

/** Downsampled trace — OpenF1-style samples (not full 3.7Hz). */
export type TelemetrySamplePoint = {
  lap: number;
  trackPosition: number;
  speedKph: number;
  throttle: number;
  brake: number;
  lateralG: number;
  longitudinalG: number;
  slipAngleDeg: number;
  brakeTemperatureC: number;
  tireWear: number;
  gripLevel: number;
  tireTemp: { inner: number; middle: number; outer: number };
};

export type SessionTelemetry = {
  sessionId: string;
  trackSlug: string;
  totalLaps: number;
  lapTimes: LapTimeData[];
  tireData: TireTelemetry[];
  speedTrace: SpeedSample[];
  sectorSplits: SectorSplit[];
  events: RaceEventTelemetry[];
  strategy: StrategySnapshot[];
  /** Per-lap advanced metrics (engine v2+). */
  advancedLaps?: AdvancedLapTelemetry[];
  /** Flattened samples for charts (bounded). */
  telemetryStream?: TelemetrySamplePoint[];
};

export type DegradationCurvePoint = {
  lap: number;
  wear: number;
  grip: number;
  compound: TireCompound;
  cliff: boolean;
};

export type LapDeltaPoint = {
  lap: number;
  delta: number;
  compound: TireCompound;
  event: RaceEventTelemetry['type'] | null;
};

export type SectorPerformanceSummary = {
  sector1: { best: number; avg: number; worst: number };
  sector2: { best: number; avg: number; worst: number };
  sector3: { best: number; avg: number; worst: number };
};

export type SpeedTracePoint = {
  corner: number;
  entry: number;
  mid: number;
  exit: number;
};
