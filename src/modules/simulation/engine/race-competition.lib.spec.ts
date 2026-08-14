import {
  computeGridRaceResult,
  pointsForPosition,
} from './race-competition.lib';

describe('race-competition.lib', () => {
  it('pointsForPosition matches F1 top-10 table', () => {
    expect(pointsForPosition(1)).toBe(25);
    expect(pointsForPosition(2)).toBe(18);
    expect(pointsForPosition(10)).toBe(1);
    expect(pointsForPosition(11)).toBe(0);
  });

  it('same inputs yield deterministic position and points', () => {
    const a = computeGridRaceResult(5000, {
      gridSize: 20,
      seedNumber: 12345,
      trackSlug: 'monza',
      fieldBaselineSeconds: 5300,
    });
    const b = computeGridRaceResult(5000, {
      gridSize: 20,
      seedNumber: 12345,
      trackSlug: 'monza',
      fieldBaselineSeconds: 5300,
    });
    expect(a.finalPosition).toBe(b.finalPosition);
    expect(a.points).toBe(b.points);
    expect(a.raceTopFinishers).toEqual(b.raceTopFinishers);
  });

  it('different seeds often yield different positions (grid)', () => {
    const positions = new Set<number>();
    const fieldBaselineSeconds = 5300;
    const playerTotal = fieldBaselineSeconds;
    for (let s = 0; s < 80; s++) {
      const o = computeGridRaceResult(playerTotal, {
        gridSize: 20,
        seedNumber: s * 9973,
        trackSlug: 'spa',
        fieldBaselineSeconds,
      });
      positions.add(o.finalPosition);
    }
    expect(positions.size).toBeGreaterThan(3);
  });

  it('faster player total ranks at least as well as slower vs same field baseline', () => {
    const fieldBaselineSeconds = 5300;
    const slow = computeGridRaceResult(8000, {
      gridSize: 20,
      seedNumber: 42,
      trackSlug: 'monza',
      fieldBaselineSeconds,
    });
    const fast = computeGridRaceResult(4000, {
      gridSize: 20,
      seedNumber: 42,
      trackSlug: 'monza',
      fieldBaselineSeconds,
    });
    expect(fast.finalPosition).toBeLessThanOrEqual(slow.finalPosition);
  });

  it('gridSize clamps to 2–22', () => {
    const tiny = computeGridRaceResult(5000, {
      gridSize: 1,
      seedNumber: 1,
      trackSlug: 'monza',
      fieldBaselineSeconds: 5000,
    });
    expect(tiny.gridSize).toBe(2);
    const huge = computeGridRaceResult(5000, {
      gridSize: 99,
      seedNumber: 1,
      trackSlug: 'monza',
      fieldBaselineSeconds: 5000,
    });
    expect(huge.gridSize).toBe(22);
  });
});
