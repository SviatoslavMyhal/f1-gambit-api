import type { Track } from '../track/entities/track.entity';
import type { RatingChange } from '../users/rating.service';
import type { MultiplayerSimulationResult } from './multiplayer.types';
import { lapsWithSectorsFromTelemetry } from './laps-map.util';
import { buildCombinedMultiplayerTimeline } from './multiplayer-timeline.util';
import type { SimulationEngineResult } from './engine/simulation.engine';
import { buildSectorHeatmap } from './sector-heatmap.util';

/**
 * Strips heavy telemetry from one driver's engine result and attaches laps + sector heatmap
 * (heatmap compares that driver vs the other on aligned laps).
 */
function stripPlayerResultForStorage(
  self: SimulationEngineResult,
  other: SimulationEngineResult,
): Record<string, unknown> {
  const { telemetry, ...rest } = self;
  const selfLaps = lapsWithSectorsFromTelemetry(telemetry);
  const otherLaps = lapsWithSectorsFromTelemetry(other.telemetry);
  const sectorHeatmap = buildSectorHeatmap(selfLaps, otherLaps);

  return {
    ...rest,
    laps: selfLaps,
    sectorHeatmap,
  } as Record<string, unknown>;
}

/** JSON persisted on `Lobby.simulationResult` after multiplayer race (API contract). */
export function buildStoredMultiplayerSimulationResult(
  r: MultiplayerSimulationResult,
  ratingChanges: RatingChange[],
  track: Track,
): Record<string, unknown> {
  const trackSectorLengthKm = [...track.sectors]
    .sort((a, b) => a.sector - b.sector)
    .map((s) => s.lengthKm);

  const hostStripped = stripPlayerResultForStorage(
    r.host.result,
    r.opponent.result,
  );
  const opponentStripped = stripPlayerResultForStorage(
    r.opponent.result,
    r.host.result,
  );

  const events = buildCombinedMultiplayerTimeline(
    r.host.result.telemetry,
    r.opponent.result.telemetry,
  );

  return {
    winner: r.winner,
    gapSeconds: r.gapSeconds,
    host: { userId: r.host.userId, result: hostStripped },
    opponent: { userId: r.opponent.userId, result: opponentStripped },
    trackSlug: r.trackSlug,
    trackSectorLengthKm,
    weather: r.weather,
    seed: r.seed,
    simulatedAt: r.simulatedAt,
    ratingChanges,
    events,
    schemaVersion: 2 as const,
  };
}
