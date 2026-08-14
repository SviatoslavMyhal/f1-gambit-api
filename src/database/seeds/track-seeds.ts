/**
 * Canonical track seed rows for migrations + TrackService fallback.
 * Sector base times are reference seconds (sum ≈ dry lap reference).
 */

export type TrackSectorSeed = {
  sector: 1 | 2 | 3;
  type: 'technical' | 'highspeed' | 'mixed';
  lengthKm: number;
  baseTime: number;
};

export type CornerDataSeed = {
  number: number;
  name?: string;
  type: 'hairpin' | 'medium' | 'fast' | 'chicane';
  speedKph: number;
  lateralG: number;
  brakingZoneM: number;
  tireThermalLoad: number;
};

export type TrackCharacteristicsSeed = {
  aeroSensitivity: number;
  mechanicalGripWeight: number;
  tireDegradationMultiplier: number;
  overtakingDifficulty: number;
  safetyCarProbability: number;
};

export type TrackSeedRow = {
  slug: string;
  name: string;
  country: string;
  lengthKm: number;
  laps: number;
  corners: number;
  averageSpeedKph: number;
  trackTemperatureC: number;
  sectors: TrackSectorSeed[];
  corners_data: CornerDataSeed[];
  characteristics: TrackCharacteristicsSeed;
};

function cornerBatch(
  count: number,
  base: Partial<CornerDataSeed>,
): CornerDataSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    name: `T${i + 1}`,
    type: (['medium', 'fast', 'hairpin', 'chicane'] as const)[i % 4],
    speedKph: base.speedKph ?? 180 + (i % 5) * 12,
    lateralG: base.lateralG ?? 3.2 + (i % 3) * 0.4,
    brakingZoneM: base.brakingZoneM ?? 80 + i * 3,
    tireThermalLoad: base.tireThermalLoad ?? 0.3 + (i % 7) * 0.08,
  }));
}

export const TRACK_SEEDS: TrackSeedRow[] = [
  {
    slug: 'monaco',
    name: 'Circuit de Monaco',
    country: 'Monaco',
    lengthKm: 3.337,
    laps: 78,
    corners: 19,
    averageSpeedKph: 160,
    trackTemperatureC: 42,
    sectors: [
      { sector: 1, type: 'technical', lengthKm: 1.1, baseTime: 32.5 },
      { sector: 2, type: 'mixed', lengthKm: 1.15, baseTime: 34.2 },
      { sector: 3, type: 'technical', lengthKm: 1.087, baseTime: 33.8 },
    ],
    corners_data: cornerBatch(19, { speedKph: 140, lateralG: 3.8 }),
    characteristics: {
      aeroSensitivity: 0.95,
      mechanicalGripWeight: 0.55,
      tireDegradationMultiplier: 0.55,
      overtakingDifficulty: 0.92,
      safetyCarProbability: 0.72,
    },
  },
  {
    slug: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy',
    lengthKm: 5.793,
    laps: 53,
    corners: 11,
    averageSpeedKph: 250,
    trackTemperatureC: 38,
    sectors: [
      { sector: 1, type: 'highspeed', lengthKm: 2.1, baseTime: 28.0 },
      { sector: 2, type: 'highspeed', lengthKm: 2.0, baseTime: 27.2 },
      { sector: 3, type: 'mixed', lengthKm: 1.69, baseTime: 29.5 },
    ],
    corners_data: cornerBatch(11, { speedKph: 260, lateralG: 2.4 }),
    characteristics: {
      aeroSensitivity: 0.2,
      mechanicalGripWeight: 0.35,
      tireDegradationMultiplier: 0.48,
      overtakingDifficulty: 0.25,
      safetyCarProbability: 0.45,
    },
  },
  {
    slug: 'silverstone',
    name: 'Silverstone Circuit',
    country: 'United Kingdom',
    lengthKm: 5.891,
    laps: 52,
    corners: 18,
    averageSpeedKph: 235,
    trackTemperatureC: 35,
    sectors: [
      { sector: 1, type: 'highspeed', lengthKm: 2.0, baseTime: 29.5 },
      { sector: 2, type: 'mixed', lengthKm: 2.1, baseTime: 31.0 },
      { sector: 3, type: 'technical', lengthKm: 1.79, baseTime: 30.2 },
    ],
    corners_data: cornerBatch(18, { speedKph: 210 }),
    characteristics: {
      aeroSensitivity: 0.75,
      mechanicalGripWeight: 0.6,
      tireDegradationMultiplier: 0.82,
      overtakingDifficulty: 0.42,
      safetyCarProbability: 0.38,
    },
  },
  {
    slug: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    lengthKm: 7.004,
    laps: 44,
    corners: 20,
    averageSpeedKph: 225,
    trackTemperatureC: 33,
    sectors: [
      { sector: 1, type: 'mixed', lengthKm: 2.4, baseTime: 31.2 },
      { sector: 2, type: 'highspeed', lengthKm: 2.5, baseTime: 32.8 },
      { sector: 3, type: 'technical', lengthKm: 2.1, baseTime: 33.5 },
    ],
    corners_data: cornerBatch(20, { speedKph: 200 }),
    characteristics: {
      aeroSensitivity: 0.7,
      mechanicalGripWeight: 0.58,
      tireDegradationMultiplier: 0.75,
      overtakingDifficulty: 0.48,
      safetyCarProbability: 0.55,
    },
  },
  {
    slug: 'suzuka',
    name: 'Suzuka International Racing Course',
    country: 'Japan',
    lengthKm: 5.807,
    laps: 53,
    corners: 18,
    averageSpeedKph: 230,
    trackTemperatureC: 36,
    sectors: [
      { sector: 1, type: 'technical', lengthKm: 1.9, baseTime: 30.5 },
      { sector: 2, type: 'mixed', lengthKm: 2.0, baseTime: 31.8 },
      { sector: 3, type: 'highspeed', lengthKm: 1.9, baseTime: 30.9 },
    ],
    corners_data: cornerBatch(18, { speedKph: 195 }),
    characteristics: {
      aeroSensitivity: 0.8,
      mechanicalGripWeight: 0.62,
      tireDegradationMultiplier: 0.88,
      overtakingDifficulty: 0.5,
      safetyCarProbability: 0.42,
    },
  },
  {
    slug: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    country: 'Brazil',
    lengthKm: 4.309,
    laps: 71,
    corners: 15,
    averageSpeedKph: 210,
    trackTemperatureC: 44,
    sectors: [
      { sector: 1, type: 'mixed', lengthKm: 1.5, baseTime: 31.0 },
      { sector: 2, type: 'technical', lengthKm: 1.4, baseTime: 32.2 },
      { sector: 3, type: 'mixed', lengthKm: 1.4, baseTime: 31.5 },
    ],
    corners_data: cornerBatch(15, { speedKph: 175 }),
    characteristics: {
      aeroSensitivity: 0.65,
      mechanicalGripWeight: 0.52,
      tireDegradationMultiplier: 0.78,
      overtakingDifficulty: 0.55,
      safetyCarProbability: 0.68,
    },
  },
  {
    slug: 'bahrain',
    name: 'Bahrain International Circuit',
    country: 'Bahrain',
    lengthKm: 5.412,
    laps: 57,
    corners: 15,
    averageSpeedKph: 205,
    trackTemperatureC: 46,
    sectors: [
      { sector: 1, type: 'technical', lengthKm: 1.8, baseTime: 30.8 },
      { sector: 2, type: 'mixed', lengthKm: 1.9, baseTime: 31.5 },
      { sector: 3, type: 'mixed', lengthKm: 1.71, baseTime: 31.2 },
    ],
    corners_data: cornerBatch(15, { speedKph: 185 }),
    characteristics: {
      aeroSensitivity: 0.6,
      mechanicalGripWeight: 0.5,
      tireDegradationMultiplier: 0.95,
      overtakingDifficulty: 0.45,
      safetyCarProbability: 0.35,
    },
  },
  {
    slug: 'singapore',
    name: 'Marina Bay Street Circuit',
    country: 'Singapore',
    lengthKm: 5.063,
    laps: 61,
    corners: 23,
    averageSpeedKph: 175,
    trackTemperatureC: 40,
    sectors: [
      { sector: 1, type: 'technical', lengthKm: 1.7, baseTime: 33.5 },
      { sector: 2, type: 'technical', lengthKm: 1.75, baseTime: 34.2 },
      { sector: 3, type: 'mixed', lengthKm: 1.61, baseTime: 33.8 },
    ],
    corners_data: cornerBatch(23, { speedKph: 125 }),
    characteristics: {
      aeroSensitivity: 0.9,
      mechanicalGripWeight: 0.58,
      tireDegradationMultiplier: 0.6,
      overtakingDifficulty: 0.88,
      safetyCarProbability: 0.78,
    },
  },
];
