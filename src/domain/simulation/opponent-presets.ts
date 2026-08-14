import type { BudgetInput } from './types';
import { REFERENCE_TOP_TEAM_ALLOCATION } from './budget-mapper';

/** Simulated “enemy” team budgets (Ergast-style constructor refs). */
export const OPPONENT_PRESETS: Record<
  string,
  { label: string; budget: BudgetInput }
> = {
  red_bull: {
    label: 'Red Bull Racing',
    budget: { ...REFERENCE_TOP_TEAM_ALLOCATION },
  },
  ferrari: {
    label: 'Ferrari',
    budget: {
      aero: 20,
      powerUnit: 21,
      chassis: 17,
      driverMarket: 19,
      reliability: 11,
      operations: 12,
    },
  },
  mercedes: {
    label: 'Mercedes',
    budget: {
      aero: 21,
      powerUnit: 19,
      chassis: 19,
      driverMarket: 18,
      reliability: 13,
      operations: 10,
    },
  },
  mclaren: {
    label: 'McLaren',
    budget: {
      aero: 23,
      powerUnit: 18,
      chassis: 18,
      driverMarket: 19,
      reliability: 10,
      operations: 12,
    },
  },
  aston_martin: {
    label: 'Aston Martin',
    budget: {
      aero: 19,
      powerUnit: 17,
      chassis: 18,
      driverMarket: 17,
      reliability: 14,
      operations: 15,
    },
  },
  alpine: {
    label: 'Alpine',
    budget: {
      aero: 18,
      powerUnit: 18,
      chassis: 17,
      driverMarket: 16,
      reliability: 15,
      operations: 16,
    },
  },
};

export function resolveOpponentPreset(ref: string | null | undefined): {
  label: string;
  budget: BudgetInput;
  ref: string;
} {
  const key = (ref || 'red_bull').toLowerCase().replace(/-/g, '_');
  const preset = OPPONENT_PRESETS[key];
  if (preset) {
    return { label: preset.label, budget: preset.budget, ref: key };
  }
  return {
    label: 'Reference team',
    budget: REFERENCE_TOP_TEAM_ALLOCATION,
    ref: 'red_bull',
  };
}

export function listOpponentPresets(): { ref: string; label: string }[] {
  return Object.entries(OPPONENT_PRESETS).map(([ref, v]) => ({
    ref,
    label: v.label,
  }));
}
