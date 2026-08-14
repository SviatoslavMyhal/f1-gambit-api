/** Normalized Ergast-compatible shapes for app use (not raw MRData). */

export type NormalizedSeason = {
  year: number;
  races: NormalizedRace[];
};

export type NormalizedRace = {
  round: number;
  raceName: string;
  circuitId: string;
  date: string;
};

export type NormalizedTeam = {
  constructorId: string;
  name: string;
  nationality?: string;
};

export type NormalizedDriver = {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
};

/** F1 driver championship table (points after season or current standings for ongoing year). */
export type NormalizedDriverStanding = {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  constructorId: string;
  constructorName: string;
};
