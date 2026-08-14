import type { TrackBias } from './types';

const ROTATION: TrackBias[] = [
  'balanced',
  'downforce',
  'power',
  'downforce',
  'balanced',
];

export function trackBiasForRace(raceIndex: number): TrackBias {
  return ROTATION[raceIndex % ROTATION.length] ?? 'balanced';
}

/** How much car aero vs power matters for lap time (0–1 weights summing loosely to strategy). */
export function paceWeightForTrack(
  bias: TrackBias,
): { aero: number; power: number } {
  switch (bias) {
    case 'downforce':
      return { aero: 0.62, power: 0.38 };
    case 'power':
      return { aero: 0.35, power: 0.65 };
    default:
      return { aero: 0.5, power: 0.5 };
  }
}
