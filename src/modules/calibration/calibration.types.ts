/** Summary stats for one numeric series (lap or sector time in seconds). */
export type NumericSeriesStats = {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
};

export type BaselineAggregatesJson = {
  lapSeconds: NumericSeriesStats;
  sector1Seconds: NumericSeriesStats;
  sector2Seconds: NumericSeriesStats;
  sector3Seconds: NumericSeriesStats;
  /** Laps excluded from aggregation (pit out, invalid, etc.). */
  excludedSampleCount: number;
  /** OpenF1 session metadata for traceability. */
  meetingName?: string;
  circuitShortName?: string;
  year?: number;
};

export type BaselineCalibrationJson = {
  sectorScales: [number, number, number];
  referenceSimMedianLap: number;
  referenceSimMedianSectors: [number, number, number];
  openf1MedianLap: number;
  openf1MedianSectors: [number, number, number];
  computedAt: string;
};

/** Raw row shape from OpenF1 GET /v1/laps (subset of fields). */
export type OpenF1LapRow = {
  lap_number?: number;
  lap_duration?: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  is_pit_out_lap?: boolean;
};

export type OpenF1MeetingRow = {
  meeting_key: number;
  meeting_name: string;
  year?: number;
  circuit_short_name?: string;
};

export type OpenF1SessionRow = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type?: string;
};
