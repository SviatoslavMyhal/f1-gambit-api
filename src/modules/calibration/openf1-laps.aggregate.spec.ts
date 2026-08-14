import {
  aggregateOpenF1LapRows,
  parseOpenF1LapRows,
  percentile,
  statsFromValues,
} from './openf1-laps.aggregate';
import type { OpenF1LapRow } from './calibration.types';

describe('openf1-laps.aggregate', () => {
  it('percentile is stable for sorted input', () => {
    const s = [10, 20, 30, 40, 50];
    expect(percentile(s, 0.5)).toBe(30);
    expect(percentile(s, 0.25)).toBe(20);
  });

  it('parseOpenF1LapRows skips lap 1 and invalid rows', () => {
    const rows: OpenF1LapRow[] = [
      {
        lap_number: 1,
        lap_duration: 90,
        duration_sector_1: 30,
        duration_sector_2: 30,
        duration_sector_3: 30,
        is_pit_out_lap: false,
      },
      {
        lap_number: 2,
        lap_duration: 88,
        duration_sector_1: 29,
        duration_sector_2: 30,
        duration_sector_3: 29,
        is_pit_out_lap: false,
      },
      {
        lap_number: 3,
        lap_duration: null,
        duration_sector_1: 29,
        duration_sector_2: 30,
        duration_sector_3: 29,
        is_pit_out_lap: false,
      },
    ];
    const { samples, excluded } = parseOpenF1LapRows(rows);
    expect(samples.length).toBe(1);
    expect(samples[0]?.lapDuration).toBe(88);
    expect(excluded).toBe(2);
  });

  it('aggregateOpenF1LapRows builds lap and sector stats', () => {
    const rows: OpenF1LapRow[] = [
      {
        lap_number: 2,
        lap_duration: 86,
        duration_sector_1: 28,
        duration_sector_2: 29,
        duration_sector_3: 29,
        is_pit_out_lap: false,
      },
      {
        lap_number: 3,
        lap_duration: 88,
        duration_sector_1: 29,
        duration_sector_2: 30,
        duration_sector_3: 29,
        is_pit_out_lap: false,
      },
    ];
    const agg = aggregateOpenF1LapRows(rows, {
      meetingName: 'Italian Grand Prix',
      year: 2024,
    });
    expect(agg).not.toBeNull();
    expect(agg!.lapSeconds.count).toBe(2);
    expect(agg!.lapSeconds.median).toBe(87);
    expect(agg!.sector1Seconds.median).toBe(28.5);
    expect(agg!.meetingName).toBe('Italian Grand Prix');
  });

  it('statsFromValues returns null for empty', () => {
    expect(statsFromValues([])).toBeNull();
  });
});
