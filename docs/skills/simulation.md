# Simulation Engine Design — Constructor's Gambit

**Scope:** Resource allocation under a cost cap, weighted engineering axes, race outcomes that feel fair and varied.

---

## Principles

1. **Reproducibility when required.** Same `(seed, allocation, scenarioId)` ⇒ same outcome for audits, replays, and tests.
2. **Stochastic where racing is uncertain.** Use a **seeded PRNG** per race step—not `Math.random()`.
3. **No dominant strategy.** Multiple allocation profiles should remain viable across a **tuned** weight surface (iterate with metrics, not vibes).
4. **Test the math, mock the world.** Unit tests target pure functions with fixed seeds; integration tests optionally run broader scenarios.

---

## Deterministic vs stochastic

| Aspect | Approach |
|--------|----------|
| **Budget → effective weights** | Deterministic formulas (smooth curves, caps). |
| **Per-lap / per-sector variance** | Stochastic from seeded RNG (weather, traffic abstracted as noise). |
| **DNF / reliability events** | Bernoulli or hazard drawn from RNG; parameters from reliability allocation. |

**Contract:** expose `seed` (or derive from `sessionId + raceNumber` with HMAC if you must hide raw seeds) so the client can optionally request “replay” behavior for debugging.

```typescript
// domain/simulation/rng.ts
import { createHash } from 'crypto';

/** Mulberry32 — small, fast, good enough for game simulation; seed from 32-bit int */
export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  const h = createHash('sha256').update(s).digest();
  return h.readUInt32BE(0);
}
```

---

## Modeling dimensions

### Aero performance

- Map allocation `aeroPct` (or EUR spent) through a **concave curve**: diminishing returns after a knee (prevents “all in aero”).
- Output: `aeroScore ∈ [0, 1]` used in lap-time delta and overtaking propensity.

```typescript
// diminishing returns: score = 1 - exp(-k * spendNorm)
export function aeroScore(spendNorm: number, k = 2.2): number {
  return 1 - Math.exp(-k * Math.min(spendNorm, 1.5));
}
```

### Power unit efficiency

- Similar curve; affects **straight-line segments** and fuel/ERS abstraction (can be a single “pace” modifier for MVP).
- **Coupling:** light negative correlation with aero if you model trade-offs (optional second-order term for depth).

### Reliability → DNF probability

- **Base DNF rate** × multiplier from low reliability spend.
- Draw once per race (MVP) or per stint (later); use **capped** probability (e.g. max 12%) so races aren’t absurd.

```typescript
export function dnfProbability(reliabilityScore: number, rng: () => number): boolean {
  const p = Math.min(0.12, 0.02 + (1 - reliabilityScore) * 0.15);
  return rng() < p;
}
```

### Driver skill

- Static `driverSkill` per session or global table for MVP.
- Apply as **small** multiplicative noise on lap delta (e.g. ±0.3%) so allocation stays primary.

---

## Weight system: budget → performance

1. **Normalize** raw slider inputs to “spend” under **hard cost cap** (reject or clip at API—prefer reject with `DomainError`).
2. **Convert spend per axis** to `scoreAxis` via curves (concave).
3. **Combine** into `paceIndex` with weights summing to 1; tune weights in config, not code constants scattered everywhere.

```typescript
// domain/simulation/config.ts — tune here or load from SSM JSON
export const SIM_WEIGHTS = {
  aero: 0.35,
  power: 0.3,
  reliability: 0.2,
  driver: 0.15,
} as const;

export function paceIndex(scores: { aero: number; power: number; reliability: number; driver: number }): number {
  const w = SIM_WEIGHTS;
  return w.aero * scores.aero + w.power * scores.power + w.reliability * scores.reliability + w.driver * scores.driver;
}
```

**Balance:** run **Monte Carlo** offline (script, not prod) over random allocations; plot distribution of finish positions. Adjust curves until variance and win rates look acceptable.

---

## Race outcome (MVP)

Simplify to **aggregate race time** or **points from positions** after N stochastic “segments”:

```typescript
export interface AllocationInput {
  aeroPct: number;
  powerPct: number;
  reliabilityPct: number;
  // driverSkillId etc.
}

export interface RaceContext {
  seed: string;
  trackId: string;
  weatherFactor?: number;
}

export function simulateRace(input: AllocationInput, ctx: RaceContext): RaceResult {
  const rng = mulberry32(seedFromString(`${ctx.seed}:${ctx.trackId}`));
  const scores = scoreFromAllocation(input); // deterministic
  let basePace = paceIndex(scores);
  // optional: multi-segment loop adding noise
  const lapNoise = () => (rng() - 0.5) * 0.02;
  const totalTime = 120 + (1 - basePace) * 30 + lapNoise() * 10;
  const dnf = dnfProbability(scores.reliability, rng);
  return { totalTime, dnf, meta: { basePace } };
}
```

Extend later: overtakes, safety cars, quali vs race—keep **pure function** boundaries.

---

## Testability

| Test type | Target |
|-----------|--------|
| Unit | `scoreFromAllocation`, `paceIndex`, curves, DNF with fixed RNG stub |
| Property / snapshot | Same seed + input ⇒ identical serialized `RaceResult` |
| Balance (offline) | Scripts, not CI gate for MVP (optional nightly) |

```typescript
describe('simulateRace', () => {
  it('is deterministic for same seed and input', () => {
    const a = simulateRace(input, { seed: 'fixed', trackId: 'monaco' });
    const b = simulateRace(input, { seed: 'fixed', trackId: 'monaco' });
    expect(a).toEqual(b);
  });
});
```

**Don't:** depend on wall clock or DB inside core `simulateRace`.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Pass `rng` or seed into pure functions | Call `Math.random()` in simulation core |
| Version simulation config (`SIM_VERSION` in result payload) | Silently change formulas without versioning |
| Log one summary object per race at info level | Log every RNG draw in production |
| Expose hooks for A/B (`scenarioId`) | Hardcode track-specific constants in 10 files |

---

## Trade-offs

| Choice | Upside | Downside |
|--------|--------|----------|
| Single aggregate race time (MVP) | Fast, easy to explain | Less “animation-friendly” detail until you add sectors |
| Concave curves | Natural diminishing returns | Tuning requires tooling/scripts |
| Seeded RNG | Replay + tests | Must store seed in `RaceResult` if users dispute outcomes |

---

*Related:* `backend.md`, `api.md`, `performance.md`
