import { pointsForPosition } from '../f1-points';

const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

describe('pointsForPosition', () => {
  it.each(POINTS_TABLE.map((pts, i) => [i + 1, pts] as [number, number]))(
    'position %i → %i points',
    (pos, expected) => {
      expect(pointsForPosition(pos)).toBe(expected);
    },
  );

  it('returns 0 for position 11 (first out-of-points)', () => {
    expect(pointsForPosition(11)).toBe(0);
  });

  it('returns 0 for position 20 (last on grid)', () => {
    expect(pointsForPosition(20)).toBe(0);
  });

  it('returns 0 for position 0 (below minimum)', () => {
    expect(pointsForPosition(0)).toBe(0);
  });

  it('returns 0 for negative positions', () => {
    expect(pointsForPosition(-1)).toBe(0);
    expect(pointsForPosition(-100)).toBe(0);
  });

  it('returns 0 for position 100 (far out of range)', () => {
    expect(pointsForPosition(100)).toBe(0);
  });
});
