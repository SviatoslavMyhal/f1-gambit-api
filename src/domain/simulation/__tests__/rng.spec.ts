import { seedFromString, mulberry32, createRng, gaussian } from '../rng';

describe('seedFromString', () => {
  it('returns the same seed for identical input', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
  });

  it('returns different seeds for different inputs', () => {
    expect(seedFromString('abc')).not.toBe(seedFromString('xyz'));
  });

  it('returns a 32-bit unsigned integer', () => {
    const seed = seedFromString('test');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(4_294_967_295);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it('is sensitive to small differences in input', () => {
    expect(seedFromString('seed-1')).not.toBe(seedFromString('seed-2'));
  });
});

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('advances state on each call', () => {
    const rng = mulberry32(99);
    const v1 = rng();
    const v2 = rng();
    expect(v1).not.toBe(v2);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('createRng', () => {
  it('same seed string → same sequence', () => {
    const a = createRng('season:1');
    const b = createRng('season:1');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('different seed strings → different sequences', () => {
    expect(createRng('race:1')()).not.toBe(createRng('race:2')());
  });

  it('composite seeds with different suffixes produce distinct sequences', () => {
    const snap = createRng('abc:snap:0:5');
    const field = createRng('abc:field:0:3');
    expect(snap()).not.toBe(field());
  });
});

describe('gaussian', () => {
  it('returns finite numbers for normal rng output', () => {
    const rng = createRng('gauss-test');
    for (let i = 0; i < 100; i++) {
      expect(isFinite(gaussian(rng))).toBe(true);
    }
  });

  it('mean is roughly 0 over many samples', () => {
    const rng = createRng('gauss-mean');
    let sum = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) sum += gaussian(rng);
    // E[X] = 0; 5σ/√N ≈ 0.05 at N=10k
    expect(Math.abs(sum / N)).toBeLessThan(0.1);
  });

  it('does not return NaN when first uniform draw is near zero (Box-Muller guard)', () => {
    let call = 0;
    const edgeRng = () => (++call % 2 === 1 ? 1e-13 : 0.5);
    const result = gaussian(edgeRng);
    expect(isFinite(result)).toBe(true);
    expect(isNaN(result)).toBe(false);
  });
});
