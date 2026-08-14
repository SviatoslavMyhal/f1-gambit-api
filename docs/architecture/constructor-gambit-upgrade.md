# Constructor's Gambit — Production Architecture Upgrade

**Purpose:** Single source of truth for the upgraded backend: domain model, simulation, F1 data, APIs, persistence, and trade-offs. **MVP horizon:** ~5–7 days of implementation; extensions are called out explicitly.

---

## A. Updated folder / module structure (NestJS)

```
src/
  common/                    # filters, interceptors, config (unchanged pattern)
  database/                  # data-source, migrations
  domain/
    simulation/              # PURE: no Nest, no TypeORM — deterministic + testable
      types.ts
      rng.ts
      f1-points.ts
      budget-mapper.ts
      track-profile.ts
      season-engine.ts
      index.ts
  modules/
    sessions/                # Session aggregate, lifecycle
    budget/                    # Allocation validation + persistence (AllocationService)
    simulation/                # Orchestrates domain engine + persistence
    results/                   # Read models for simulation outputs
    f1-data/                   # External F1 API + cache + normalization
    leaderboard/               # Rankings (DB-backed)
    insights/                  # Derived metrics from stored results (optional thin)
  configure-app.ts
  app.module.ts
  lambda.ts
```

**Boundary rules**

| Layer | May import |
|-------|------------|
| `domain/simulation` | Only stdlib / other `domain` files |
| `modules/*` | Nest, TypeORM, `domain/simulation`, `modules/*` (avoid cycles) |
| `f1-data` | HTTP client, cache repo — **no** simulation domain details |

---

## B. Entity schemas (TypeORM) — logical model

### Implemented in MVP (code + migration)

| Entity | Table | Role |
|--------|-------|------|
| `Session` | `sessions` | Aggregate root: player, status, allocation JSON, optional compare ref, season year, seed |
| `SimulationRun` | `simulation_runs` | Append-only: `seed`, `simVersion`, full `result` JSON (events, standings, metrics) |
| `F1ApiCache` | `f1_api_cache` | Key/value JSON cache for external API (Lambda-friendly, survives cold start miss via DB) |
| `LeaderboardEntry` | `leaderboard_entries` | Persistent top list |

### Documented for next iteration (relational reference data)

These reduce JSON blobs and improve analytics; **not required** for first playable MVP if `f1_api_cache` + domain JSON suffice.

| Entity | Relationships | Notes |
|--------|---------------|--------|
| `Season` | 1:N `Race` | `year` unique |
| `Team` | N `Driver` (season-dependent in real F1; model `DriverContract` later) | `constructorRef` matches Ergast |
| `Race` | N `SimulationEvent` (optional) | Round, circuit, `trackBias` enum |
| `CarPerformanceProfile` | 1:1 `Session` or embedded in `SimulationRun` | **Embedded in JSON** for MVP |
| `DriverProfile` | embedded | Same |
| `RaceEvent` | stored inside `SimulationRun.result.timeline` | Overtake, pit, DNF, SC — **array in JSON** for MVP |
| `LapData` | optional summary only | `avgLapDeltaMs`, `qualifyingDeltaMs` — not full telemetry |

**Why embed profiles in `SimulationRun.result`:** sub-300ms hot path stays **one read** by `sessionId`; avoids joins until you need SQL-level analytics.

---

## C. Key services

### `SimulationService` (`modules/simulation`)

- Loads `Session`, validated allocation, optional `compareConstructorRef` (e.g. Red Bull).
- Resolves **baseline opponent** (same engine, fixed “realistic” allocation for reference team).
- Calls `simulateSeason()` from `domain/simulation` with **seed** (client or derived).
- Persists `SimulationRun`, updates `Session`, pushes `LeaderboardEntry` when appropriate.

### `BudgetService` / allocation (`modules/budget`)

- Validates **percentage** allocations (sum = 100) or **future:** $140M absolute — same math after normalization.
- Maps DTO → internal `BudgetInput` for `budget-mapper`.

### `F1DataService` (`modules/f1-data`)

- HTTP client to **Ergast-compatible** API (production default: **Jolpica-hosted Ergast mirror** — Ergast itself is deprecated).
- **Normalize** responses to stable DTOs: `ConstructorStanding`, `DriverStanding`, `RaceResult`, `CircuitSummary`.
- **Cache:** DB table `f1_api_cache` + short in-memory TTL to protect latency and external API.

### `InsightsService` (`modules/insights`) — optional

- Pure functions over `SimulationRun.result`: DNF rate, avg finish, pace vs leader, consistency — **no DB** if result JSON already contains fields.

---

## D. Example code snippets (reference)

### Deterministic season output shape

```typescript
// domain/simulation/types.ts (excerpt)
export type SimulationResultPayload = {
  simVersion: number;
  seed: string;
  seasonYear: number;
  races: RaceOutcome[];
  driverStandings: StandingRow[];
  constructorStandings: StandingRow[];
  events: RaceEvent[];
  metrics: F1MetricsSnapshot;
  comparison?: RedBullComparison;
};
```

### Seeded RNG (deterministic replay)

```typescript
// domain/simulation/rng.ts — mulberry32 + stable string seed
export function createRng(seed: string): () => number;
```

### Budget → performance

```typescript
// domain/simulation/budget-mapper.ts
export function mapBudgetToProfiles(input: BudgetInput): {
  car: CarPerformanceProfile;
  driver: DriverProfile;
  strategy: StrategyProfile;
};
```

### F1 data client

```typescript
// modules/f1-data/ergast-http.client.ts
// GET {base}/f1/{year}/constructorStandings.json
```

---

## E. Architectural decisions (with reasoning)

| Decision | Reasoning | Trade-off |
|----------|-----------|-----------|
| **Pure `domain/simulation`** | Unit-testable, no DB in hot logic; Lambda-friendly CPU | Thin orchestration in Nest services |
| **`SimulationRun` JSON blob** | One read for UX; <300ms | SQL analytics harder until ETL or materialized views |
| **`f1_api_cache` KV table** | Ships fast; survives Lambda instances | Not normalized; add `Team`/`Race` tables when reporting needs them |
| **Jolpica Ergast mirror** | Ergast deprecated; same response shape | Third-party uptime; configurable `F1_API_BASE_URL` |
| **5 races / mini-season** | Matches “interactive session” length | Not full calendar — document clearly in API |
| **Red Bull comparison** | Same engine + reference allocation vs **your** allocation + optional real standings snippet | Numbers not apples-to-apples with full real season — communicate as “flavor + fair in-sim comparison” |
| **Idempotent simulate** | `seed` + `sessionId` stored for replay | Clients must not reuse seed across different allocations unintentionally |

---

## Budget → performance system (detailed)

**Inputs (percent, sum = 100):** `aero`, `powerUnit`, `chassis`, `driverMarket`, `reliability`, `operations`

| Axis | Maps to | Notes |
|------|---------|--------|
| Aero + chassis | `aeroEfficiency`, tire wear | Concave curve; **trade-off** reduces `straightLineSpeed` |
| Power unit | `straightLineSpeed` | Trade-off vs aero on power tracks |
| Reliability | DNF hazard cap | Bernoulli draw per race |
| Operations | Pit/strategy efficiency | Fewer “slow pit” events |
| Driver market | `pace`, `consistency`, `overtakingSkill`, `wetPerformance` | Scaled subset |

**Diminishing returns:** `score = 1 - exp(-k * normalizedSpend)`.

**Controlled randomness:** all from `createRng(seed + raceIndex + sessionSalt)`.

---

## External F1 data integration

- **Source:** `F1_API_BASE_URL` default `https://api.jolpi.ca/ergast`
- **Use:** constructor standings, driver list, optional last results for **baseline copy** in UI.
- **Ingestion:** on-demand per endpoint + **optional** nightly cron (not required MVP).
- **Caching:** `f1_api_cache` TTL 6–24h for standings; shorter for “current” weekend if needed later.

---

## Simulation engine (5 races)

- **Tracks:** rotate `downforce` / `power` / `balanced` characteristics (from `track-profile.ts`).
- **Weather:** optional RNG bucket affecting wet performance stats.
- **Events:** DNF, pit loss, overtake — appended to `events[]` with `raceIndex`.
- **Points:** F1-style table for top 10 per race; aggregate to constructors + drivers.

---

## API surface (global prefix `api/v1`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/sessions` | Create session |
| POST | `/sessions/:id/budget` | Submit allocation (legacy path) |
| POST | `/sessions/:id/allocations` | Alias |
| POST | `/sessions/:id/simulate` | Body `{ seed?: string }` |
| GET | `/sessions/:id` | Session + latest result summary |
| GET | `/results/:sessionId` | Latest `SimulationRun` |
| GET | `/leaderboard` | Query `limit` |
| POST | `/leaderboard` | Submit entry (if not auto) |
| GET | `/f1/seasons/:year/constructors` | Cached proxy |
| GET | `/f1/seasons/:year/drivers` | Cached proxy |

---

## Wow-factor backend support

| Feature | Mechanism |
|---------|-----------|
| “What Red Bull did” | `compareConstructorRef` + real standings from F1 API + in-sim baseline car |
| Optimal allocation | **Offline** greedy / grid search in script; API `GET /sessions/:id/hint` optional later |
| Replayable | Store `seed` + `simVersion` on `SimulationRun` |
| What-if | New session or `POST` simulate with same seed, different allocation → new `SimulationRun` |

---

## Performance

- **Target:** p95 **< 300ms** warm for simulate; cold start separate (see `docs/skills/performance.md`).
- **Techniques:** single DB write transaction; no N+1; simulation pure in-memory; F1 API always cached.

---

## Database indexes (MVP)

| Table | Index |
|-------|--------|
| `simulation_runs` | `(sessionId, createdAt DESC)` |
| `leaderboard_entries` | `(constructorPoints DESC, createdAt ASC)` |
| `f1_api_cache` | PK `cacheKey` |

---

*Implementation files in this repo reflect the MVP row of this table; extend entities as product validation warrants.*

---

## Implementation map (this repository)

| Area | Location |
|------|----------|
| Pure simulation | `src/domain/simulation/` — `simulateSeason()`, `mapBudgetToProfiles()`, `REFERENCE_TOP_TEAM_ALLOCATION` |
| F1 HTTP + DB cache | `src/modules/f1-data/` — `F1DataService`, `ErgastHttpClient`, `F1ApiCache` |
| Orchestration | `src/modules/simulation/simulation.service.ts` |
| Persistence | `Session`, `SimulationRun`, `LeaderboardEntry` entities + migration `1740000000000-ConstructorGambitUpgrade.ts` |
| Results API | `src/modules/results/` — `GET /api/v1/results/:sessionId` |
| F1 proxy | `GET /api/v1/f1/seasons/:year/constructors` and `.../drivers` |
| Env | `F1_API_BASE_URL` (default `https://api.jolpi.ca/ergast`), `F1_API_TIMEOUT_MS` |

**Run migrations** after pull: `npm run migration:run`
