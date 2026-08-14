import { TireCompound } from '../setup/dto/tire-compound';
import type { RaceStrategyDto } from './dto/race-strategy.dto';
import type { RaceStrategy } from './strategy/race-strategy';

/**
 * Maps compact lobby strategy DTO → full engine RaceStrategy for current track length.
 */
export function raceStrategyDtoToRaceStrategy(
  dto: RaceStrategyDto,
  laps: number,
): RaceStrategy {
  let [earliest, latest] = dto.pitWindow;
  earliest = Math.max(1, Math.min(earliest, laps - 2));
  latest = Math.max(earliest, Math.min(latest, laps - 2));
  const optimal = Math.min(laps - 5, Math.max(earliest, Math.floor((earliest + latest) / 2)));

  const pushMode =
    dto.aggressionLevel > 6 ? 'PUSH' : dto.aggressionLevel < 4 ? 'SAVE' : 'MANAGE';

  const secondCompound =
    dto.startingCompound === TireCompound.HARD
      ? TireCompound.MEDIUM
      : TireCompound.HARD;

  return {
    stints: [
      {
        stint: 0,
        compound: dto.startingCompound,
        startLap: 1,
        targetEndLap: optimal,
        pushMode,
      },
      {
        stint: 1,
        compound: secondCompound,
        startLap: optimal + 1,
        targetEndLap: laps,
        pushMode: 'MANAGE',
      },
    ],
    pitWindows: [
      {
        stint: 0,
        earliest,
        latest,
        optimal,
        undercut: dto.safetyCarReaction === 'pit',
        overcut: false,
      },
    ],
    targetLapTime: 90 + (10 - dto.aggressionLevel) * 0.2,
    underFuelThreshold: dto.fuelLoad >= 3 ? 5 : 3,
  };
}
