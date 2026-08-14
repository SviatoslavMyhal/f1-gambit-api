import { trackBiasForRace, paceWeightForTrack } from '../track-profile';
import type { TrackBias } from '../types';

describe('trackBiasForRace', () => {
  it('returns correct bias for each position in the rotation', () => {
    expect(trackBiasForRace(0)).toBe('balanced');
    expect(trackBiasForRace(1)).toBe('downforce');
    expect(trackBiasForRace(2)).toBe('power');
    expect(trackBiasForRace(3)).toBe('downforce');
    expect(trackBiasForRace(4)).toBe('balanced');
  });

  it('wraps around at index 5 (same as index 0)', () => {
    expect(trackBiasForRace(5)).toBe(trackBiasForRace(0));
  });

  it('is consistent for any raceIndex mod 5', () => {
    for (let i = 0; i < 25; i++) {
      expect(trackBiasForRace(i)).toBe(trackBiasForRace(i % 5));
    }
  });

  it('returns a valid TrackBias value for any non-negative index', () => {
    const valid: TrackBias[] = ['balanced', 'downforce', 'power'];
    for (let i = 0; i < 20; i++) {
      expect(valid).toContain(trackBiasForRace(i));
    }
  });
});

describe('paceWeightForTrack', () => {
  it('downforce track: aero weight is greater than power weight', () => {
    const { aero, power } = paceWeightForTrack('downforce');
    expect(aero).toBeGreaterThan(power);
  });

  it('power track: power weight is greater than aero weight', () => {
    const { aero, power } = paceWeightForTrack('power');
    expect(power).toBeGreaterThan(aero);
  });

  it('balanced track: aero weight equals power weight', () => {
    const { aero, power } = paceWeightForTrack('balanced');
    expect(aero).toBe(power);
  });

  it('returns exact documented values', () => {
    expect(paceWeightForTrack('downforce')).toEqual({ aero: 0.62, power: 0.38 });
    expect(paceWeightForTrack('power')).toEqual({ aero: 0.35, power: 0.65 });
    expect(paceWeightForTrack('balanced')).toEqual({ aero: 0.5, power: 0.5 });
  });

  it('both weights are positive for all biases', () => {
    for (const bias of ['balanced', 'downforce', 'power'] as TrackBias[]) {
      const { aero, power } = paceWeightForTrack(bias);
      expect(aero).toBeGreaterThan(0);
      expect(power).toBeGreaterThan(0);
    }
  });
});
