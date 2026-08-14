import { createHash } from 'crypto';

/** Deterministic 32-bit seed from arbitrary string (stable across Node versions for same input). */
export function seedFromString(s: string): number {
  const h = createHash('sha256').update(s).digest();
  return h.readUInt32BE(0);
}

/** Mulberry32 — fast, deterministic PRNG for game/simulation use. */
export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): () => number {
  return mulberry32(seedFromString(seed));
}

/** Standard normal N(0,1) — Box–Muller; uses two uniform draws from rng. */
export function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
