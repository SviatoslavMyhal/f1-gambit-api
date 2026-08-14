export enum TireCompound {
  SOFT = 'SOFT',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INTER = 'INTER',
  WET = 'WET',
}

export type CompoundProfile = {
  lapTimeDelta: number;
  degradationRate: number;
  optimalWindow: [number, number];
  thermalSensitivity: number;
};

export const COMPOUND_PROFILE: Record<TireCompound, CompoundProfile> = {
  SOFT: {
    lapTimeDelta: -1.4,
    degradationRate: 0.085,
    optimalWindow: [80, 100],
    thermalSensitivity: 0.9,
  },
  MEDIUM: {
    lapTimeDelta: -0.6,
    degradationRate: 0.055,
    optimalWindow: [70, 95],
    thermalSensitivity: 0.6,
  },
  HARD: {
    lapTimeDelta: 0.0,
    degradationRate: 0.032,
    optimalWindow: [60, 90],
    thermalSensitivity: 0.3,
  },
  INTER: {
    lapTimeDelta: 2.0,
    degradationRate: 0.04,
    optimalWindow: [20, 60],
    thermalSensitivity: 0.2,
  },
  WET: {
    lapTimeDelta: 5.0,
    degradationRate: 0.025,
    optimalWindow: [0, 40],
    thermalSensitivity: 0.1,
  },
};
