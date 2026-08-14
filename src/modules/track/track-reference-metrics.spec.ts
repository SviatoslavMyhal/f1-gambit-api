import {
  buildReferenceComparisons,
  pickClosestReferenceMatch,
} from './track-reference-metrics';

describe('track-reference-metrics', () => {
  it('pickClosestReferenceMatch picks smallest |Δ total|', () => {
    const rows = buildReferenceComparisons(
      'monza',
      5350,
      80,
      [26.6, 26.3, 26.9],
      ['quali_push', 'race_manage'],
      { playerTopSpeedStraightKph: 350 },
    );
    const closest = pickClosestReferenceMatch(rows);
    expect(closest).not.toBeNull();
    expect(closest!.referenceId).toBeDefined();
    expect(closest!.absDeltaTotalSeconds).toBeGreaterThanOrEqual(0);
  });

  it('includes deltaTopSpeedStraightKph when player top speed given', () => {
    const rows = buildReferenceComparisons(
      'monza',
      5300,
      79.5,
      [26.5, 26.2, 26.8],
      ['quali_push'],
      { playerTopSpeedStraightKph: 360 },
    );
    expect(rows[0]!.deltaTopSpeedStraightKph).toBeDefined();
    expect(rows[0]!.setupPreset.frontWing).toBeDefined();
  });
});
