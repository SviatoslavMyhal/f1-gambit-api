import type { CarSetupDto } from '../../setup/dto/car-setup.dto';
import type { SeededRandom } from './seeded-random';

export type DriverMetrics = {
  brakingAggression: number;
  throttleSmoothness: number;
  consistencyScore: number;
  mistakeProbability: number;
};

/**
 * Derives driver-style metrics from lap index and recent lap time variance (deterministic).
 * Uses a dedicated RNG so the main simulation RNG stream stays unchanged.
 */
export function computeDriverMetrics(
  lap: number,
  recentLapTimes: number[],
  rng: SeededRandom,
  setup?: Pick<
    CarSetupDto,
    'brakeBias' | 'differentialOnThrottle' | 'suspensionStiffness'
  >,
): DriverMetrics {
  const n = recentLapTimes.length;
  let variance = 0;
  if (n >= 2) {
    const mean = recentLapTimes.reduce((a, b) => a + b, 0) / n;
    variance =
      recentLapTimes.reduce((s, t) => s + (t - mean) ** 2, 0) / n;
  }
  const consistencyScore = Math.max(
    0,
    Math.min(1, 1 - Math.sqrt(variance) / 8),
  );

  let brakingAggression = Math.min(
    1,
    Math.max(
      0.2,
      0.55 +
        0.12 * Math.sin(lap / 14) +
        (rng.next() - 0.5) * 0.06,
    ),
  );

  if (setup) {
    brakingAggression = Math.min(
      1,
      brakingAggression +
        (66 - setup.brakeBias) * 0.012 +
        (setup.differentialOnThrottle - 75) * 0.004,
    );
  }

  const throttleSmoothness = Math.min(
    1,
    Math.max(
      0.3,
      0.72 -
        variance * 0.08 +
        (rng.next() - 0.5) * 0.04 -
        (setup?.suspensionStiffness ?? 5) * 0.008,
    ),
  );

  const mistakeProbability = Math.min(
    0.35,
    0.02 + variance * 0.015 + (lap > 50 ? 0.01 : 0),
  );

  return {
    brakingAggression,
    throttleSmoothness,
    consistencyScore,
    mistakeProbability,
  };
}
