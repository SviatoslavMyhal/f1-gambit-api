# Database & Persistence — Constructor's Gambit API

**Scope:** PostgreSQL (RDS), TypeORM, RDS Proxy, Lambda concurrency, migrations.

---

## Principles

1. **RDS Proxy** between Lambda and Postgres: **pooling + IAM auth option**; avoids connection storms at scale.
2. **Migrations are code:** TypeORM migrations committed with PRs; no manual drift in prod.
3. **Optimistic for conflicts:** sessions updated by single user per session for MVP; if you add concurrent edits, use `version` column + retry.

---

## Schema design (MVP)

### `sessions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | trigger or app-level |
| `cost_cap_units` | `int` or `numeric` | frozen at creation or configurable |
| `metadata` | `jsonb` | optional: client name, difficulty |
| `status` | `varchar` | e.g. `active`, `completed` |

### `allocations`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `bigserial` PK | |
| `session_id` | `uuid` FK → `sessions.id` ON DELETE CASCADE | |
| `aero_pct` / `power_pct` / … | `smallint` or `numeric` | enforce sum in app + CHECK if fixed schema |
| `submitted_at` | `timestamptz` | |
| `idempotency_key` | `varchar(64)` | UNIQUE per `session_id` NULLS DISTINCT (Postgres 15+) or partial unique |

**Alternative:** store allocation as single `jsonb` with JSON schema validation in app—faster iteration, weaker DB-level constraints.

### `race_results`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `bigserial` PK | |
| `session_id` | `uuid` FK UNIQUE | one result per session for MVP |
| `seed` | `varchar` | replay |
| `sim_version` | `smallint` | |
| `dnf` | `boolean` | |
| `position` | `smallint` | |
| `total_race_time_ms` | `int` | |
| `raw` | `jsonb` | breakdown, tuning, audit |
| `created_at` | `timestamptz` | |

### `leaderboard_entries` (if denormalized)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `bigserial` | |
| `session_id` | `uuid` | |
| `display_name` | `varchar` | |
| `score` | `numeric` or `int` | lower time = better, or points |
| `rank` | **computed in query** or materialized | avoid storing rank unless needed for caching |
| `created_at` | `timestamptz` | |

Index: `(score ASC)` or `(score DESC)` depending on sort; **partial index** `WHERE score IS NOT NULL` if needed.

---

## Indexing strategy

| Table | Index | Reason |
|-------|-------|--------|
| `sessions` | PK | — |
| `allocations` | `(session_id, submitted_at DESC)` | latest allocation per session |
| `race_results` | `session_id` | unique lookup |
| `leaderboard_entries` | `(score ASC, created_at ASC)` | top-K queries |

**Avoid:** over-indexing every JSON path early—add when `EXPLAIN` shows seq scans on hot queries.

---

## Concurrent writes from Lambda

- **Many Lambdas, one DB:** RDS Proxy multiplexes; still **keep transactions short**.
- **Pattern:** `BEGIN` → read session → validate → insert allocation / result → `COMMIT`.
- **Idempotency:** `INSERT ... ON CONFLICT (session_id, idempotency_key) DO NOTHING RETURNING *` or upsert pattern for duplicate client retries.
- **Leaderboard:** insert after race; if using **single global counter**, serialize via row lock only if necessary—prefer **append-only** table and rank by query for MVP.

---

## Migration strategy

1. **Forward-only** migrations in `src/database/migrations/`.
2. **Naming:** `Timestamp-Description.ts` (TypeORM style).
3. **Process:** dev applies locally; CI runs migrate against ephemeral DB; prod apply in pipeline **after** backup window for risky changes.
4. **Destructive changes:** expand/contract pattern when live—add column → dual-write → backfill → switch reads → drop old.

```typescript
// Example: add column nullable first
await queryRunner.query(`ALTER TABLE race_results ADD COLUMN breakdown jsonb`);
```

**Don't:** edit applied migration files; add a new migration to fix.

---

## TypeORM + Lambda notes

- **Single `DataSource`** initialized outside handler (global scope) and reused; see `performance.md`.
- **Connection limit:** align Lambda max concurrency with RDS `max_connections` via Proxy limits; start conservative in dev.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Use transactions for allocation + result if atomic | Leave partial state without `status` on session |
| Store `sim_version` on results | Lose ability to explain old rows |
| Add CHECK constraints when schema is stable | Put business rules only in DB and duplicate in app inconsistently |

---

## Trade-offs

| Choice | Upside | Downside |
|--------|--------|----------|
| `jsonb` allocation | Flexible sliders/axes | Fewer DB-level validations |
| Separate `allocations` table | History for analytics | More joins |
| One `race_results` per session | Simple | No multi-race per session without migration |

---

*Related:* `backend.md`, `performance.md`, `observability.md`
