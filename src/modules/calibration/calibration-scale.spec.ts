import {
  clampSectorScale,
  computeSectorScales,
  SECTOR_SCALE_MAX,
  SECTOR_SCALE_MIN,
} from './calibration-scale';

describe('calibration-scale', () => {
  it('clampSectorScale respects bounds', () => {
    expect(clampSectorScale(1)).toBe(1);
    expect(clampSectorScale(5)).toBe(SECTOR_SCALE_MAX);
    expect(clampSectorScale(0.01)).toBe(SECTOR_SCALE_MIN);
  });

  it('computeSectorScales matches openf1 vs sim medians', () => {
    const s = computeSectorScales(
      90,
      [30, 30, 30],
      100,
      [33.33, 33.33, 33.34],
    );
    expect(s[0]).toBeCloseTo(0.9, 2);
    expect(s[1]).toBeCloseTo(0.9, 2);
    expect(s[2]).toBeCloseTo(0.9, 2);
  });

  it('returns identity when sim lap median is zero', () => {
    expect(computeSectorScales(90, [30, 30, 30], 0, [1, 1, 1])).toEqual([
      1, 1, 1,
    ]);
  });
});
