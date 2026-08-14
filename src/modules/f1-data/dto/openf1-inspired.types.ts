/**
 * Reference-shaped types (OpenF1 / F1 timing data style) for API extensions and caching.
 * Not a wire-for-wire copy of external APIs — field names align with common patterns.
 *
 * @see https://openf1.org (timing, car telemetry)
 * @see https://ergast.com/mrd/ (race results, standings)
 */

/** Ergast-style race result row (subset). */
export type ErgastRaceResultRow = {
  position: string;
  points: string;
  grid: string;
  laps: string;
  status: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor: { constructorId: string; name: string };
  Time?: { millis: string; time: string };
};

/** OpenF1-style lap timing fragment. */
export type OpenF1LapFragment = {
  session_key: number;
  driver_number: number;
  lap_number: number;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  lap_duration?: number | null;
};

/** OpenF1-style car telemetry sample (subset). */
export type OpenF1CarTelemetrySample = {
  session_key: number;
  driver_number: number;
  date: string;
  rpm: number;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number;
};
