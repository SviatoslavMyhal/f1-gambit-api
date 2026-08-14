import { buildSectorHeatmap } from './sector-heatmap.util';
import type { LapWithSectors } from './laps-map.util';

describe('buildSectorHeatmap', () => {
  it('classifies each sector independently (mixed cells across S1–S3)', () => {
    const host: LapWithSectors[] = [
      { lap: 1, timeSeconds: 1, sectors: [10, 21, 30] },
      { lap: 2, timeSeconds: 1, sectors: [11, 22, 31] },
    ];
    const opp: LapWithSectors[] = [
      { lap: 1, timeSeconds: 1, sectors: [11, 19, 35] },
      { lap: 2, timeSeconds: 1, sectors: [10.5, 20, 29] },
    ];
    const h = buildSectorHeatmap(host, opp);
    expect(h[0]![0]).toBe('pb');
    expect(h[1]![0]).toBe('pb');
    expect(h[2]![0]).toBe('pb');
    expect(h[1]![1]).toBe('none');
  });

  it('marks sb when not pb but faster on lap+dimension vs opponent', () => {
    const host: LapWithSectors[] = [
      { lap: 1, timeSeconds: 90, sectors: [10, 20, 30] },
      { lap: 2, timeSeconds: 88, sectors: [10.01, 19, 29] },
    ];
    const opp: LapWithSectors[] = [
      { lap: 1, timeSeconds: 91, sectors: [12, 18, 31] },
      { lap: 2, timeSeconds: 89, sectors: [12, 18, 31] },
    ];
    const grid = buildSectorHeatmap(host, opp);
    expect(grid[0]![1]).toBe('sb');
    expect(grid[1]![1]).toBe('pb');
  });

  it('marks improved on lap-to-lap sector improvement', () => {
    const host: LapWithSectors[] = [
      { lap: 1, timeSeconds: 1, sectors: [10, 1, 1] },
      { lap: 2, timeSeconds: 1, sectors: [12, 1, 1] },
      { lap: 3, timeSeconds: 1, sectors: [11, 1, 1] },
    ];
    const opp: LapWithSectors[] = [
      { lap: 1, timeSeconds: 1, sectors: [10, 1, 1] },
      { lap: 2, timeSeconds: 1, sectors: [10, 1, 1] },
      { lap: 3, timeSeconds: 1, sectors: [10.8, 1, 1] },
    ];
    const grid = buildSectorHeatmap(host, opp);
    expect(grid[0]![2]).toBe('improved');
  });
});
