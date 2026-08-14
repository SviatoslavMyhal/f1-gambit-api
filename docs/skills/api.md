# API Design Principles — Constructor's Gambit API

**Scope:** HTTP API behind API Gateway (HTTP API), NestJS controllers, interactive UX (sliders, instant feedback).

---

## Principles

1. **Predictable contracts.** Stable JSON shapes, explicit error `code`, version simulation-affecting changes.
2. **Fast by default.** Read paths avoid extra round trips; writes are clear and idempotent where it matters.
3. **Stateless Lambda.** Session identity lives in **DB + client-held token/id**; no sticky sessions on API Gateway for MVP.

---

## Endpoint structure

**Pattern:** resource-oriented, action-specific subpaths only when it improves clarity.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/sessions` | Create session (returns `sessionId`, optional `clientToken`) |
| `GET` | `/sessions/:id` | Session metadata, cost cap snapshot |
| `PUT` | `/sessions/:id/allocations` | Submit allocation (validated, idempotent key optional) |
| `POST` | `/sessions/:id/simulate` | Run race (or combine with allocation in one call if UX needs fewer requests) |
| `GET` | `/leaderboard` | Top N (query: `limit`, `cursor`) |
| `POST` | `/leaderboard` | Submit final score (if separate from simulate) |

**Naming:** use **`snake_case` or `camelCase` consistently**—pick one for JSON fields (this codebase should align with existing DTOs; never mix).

**Headers:**

- `X-Correlation-Id` — optional client-provided; else server generates and echoes.
- `Authorization` — if using Cognito / API keys later; MVP may omit.

---

## Idempotency

**When:** `PUT` allocations, `POST` simulate if retries can double-charge or duplicate results.

**How (MVP):**

- Client sends `Idempotency-Key: <uuid>` (or body field `idempotencyKey`).
- Server stores **hash(key + sessionId + operation)** → result row or short TTL cache (DynamoDB or Postgres unique constraint).

```typescript
// sessions.controller.ts (conceptual)
@Put(':id/allocations')
async putAllocation(
  @Param('id') sessionId: string,
  @Headers('idempotency-key') idempotencyKey: string | undefined,
  @Body() dto: SubmitAllocationDto,
) {
  return this.sessionsService.updateAllocation(sessionId, dto, idempotencyKey);
}
```

**Don't:** require idempotency for simple GETs; **do** document which POST/PUT are safe to retry.

---

## Session handling: stateless vs semi-stateful

| Approach | Description |
|----------|-------------|
| **Stateless API** | Every request includes `sessionId` (UUID); Lambda has no memory of prior call. |
| **Semi-stateful client** | Client stores `sessionId` + last allocation; server persists authoritative state in Postgres. |

**MVP:** stateless Lambdas + **RDS** as source of truth. Optional **short TTL cache** (see `performance.md`) for read-heavy leaderboard only.

---

## Request / response contracts

**Success envelope (optional team convention):**

```json
{
  "data": { },
  "meta": { "correlationId": "…", "simVersion": 1 }
}
```

**Error envelope (align with backend filter):**

```json
{
  "error": {
    "code": "COST_CAP_EXCEEDED",
    "message": "…",
    "meta": { "allocated": 120, "cap": 100 }
  },
  "correlationId": "…"
}
```

**Simulation response** should include enough for UI animation without second call:

- `finishingPosition`, `dnf`, `totalRaceTimeMs` (or abstract `score`)
- `seed` / `simVersion` for support
- Optional `breakdown`: per-sector or per-lap summaries if you add them later

```typescript
export class SimulateResponseDto {
  sessionId!: string;
  simVersion!: number;
  seed!: string;
  dnf!: boolean;
  position!: number;
  totalRaceTimeMs!: number;
  breakdown?: SectorSummaryDto[];
}
```

---

## Latency optimization (API layer)

1. **Merge calls:** if the UX does allocation + simulate in one gesture, offer `POST /sessions/:id/simulate` with body including allocation to avoid two Lambda invocations.
2. **Pagination:** leaderboard `limit` default small (e.g. 50); cursor-based for large tables later.
3. **Compression:** API Gateway supports gzip; ensure client sends `Accept-Encoding: gzip` for large payloads.
4. **Timeouts:** set API Gateway and Lambda timeouts with headroom; client timeout should be **> p99** server latency to avoid duplicate submits.

**Target:** interactive paths **< 300ms** server-side in warm conditions (see `performance.md`).

---

## Do / Don't

| Do | Don't |
|----|--------|
| Validate all inputs at boundary | Rely on frontend for cost-cap enforcement |
| Return `simVersion` when logic changes | Break clients silently |
| Use clear HTTP verbs | Use `GET` with side effects |
| Document idempotent endpoints in OpenAPI | Let clients guess retry safety |

---

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Combined simulate + allocate endpoint | Fewer round trips, lower perceived latency | Slightly fatter controller |
| Strict error codes | Easier client handling | Must maintain catalog |
| Cursor leaderboard | Scalable | More work than offset pagination |

---

*Related:* `backend.md`, `database.md`, `performance.md`
