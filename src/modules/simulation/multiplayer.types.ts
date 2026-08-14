import type { WeatherCondition } from '../lobby/lobby.types';
import type { RatingChange } from '../users/rating.service';
import type { SessionTelemetry } from '../telemetry/telemetry.types';
import type { SimulationEngineResult } from './engine/simulation.engine';

export type { MultiplayerTimelineEvent } from './multiplayer-timeline.util';
export type { SectorHeatmapCell } from './sector-heatmap.util';

export type MultiplayerSimulationResult = {
  winner: string | null;
  gapSeconds: number;
  host: { userId: string; result: SimulationEngineResult };
  opponent: { userId: string; result: SimulationEngineResult };
  trackSlug: string;
  weather: WeatherCondition;
  seed: number;
  simulatedAt: string;
  ratingChanges?: RatingChange[];
};

export type MultiplayerTelemetryPayload = {
  host: SessionTelemetry;
  opponent: SessionTelemetry;
  lapDeltaComparison: {
    lap: number;
    hostTime: number | null;
    opponentTime: number | null;
    delta: number;
  }[];
  tireWearComparison: {
    lap: number;
    hostWear: number | null;
    opponentWear: number | null;
  }[];
  sectorDeltaComparison: {
    lap: number;
    hostS1: number;
    hostS2: number;
    hostS3: number;
    opponentS1: number | null;
    opponentS2: number | null;
    opponentS3: number | null;
  }[];
};
