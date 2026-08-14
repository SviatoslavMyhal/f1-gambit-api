# Observability & Reliability — Constructor's Gambit API

**Scope:** CloudWatch Logs + Metrics, structured JSON logging, debugging simulations, security-aligned practices (rate limits, validation).

---

## Principles

1. **One JSON object per log line** — filterable in CloudWatch Logs Insights.
2. **Metrics that drive action** — error rate, latency, throttles—not vanity counts.
3. **Simulation debuggability** — correlation IDs + optional `simVersion` + seed in result payloads (not only logs).

---

## Logging structure (JSON)

**Required fields (conceptual):**

| Field | Example | Notes |
|-------|---------|--------|
| `timestamp` | ISO8601 | CloudWatch adds; ensure Pino/winston uses ISO |
| `level` | `info`, `warn`, `error` | |
| `msg` | `session.simulate.completed` | Stable event names |
| `correlationId` | UUID | From `X-Correlation-Id` or generated |
| `requestId` | Lambda request ID | `context.awsRequestId` |
| `route` | `POST /sessions/:id/simulate` | Normalize params to `:id` |
| `durationMs` | `42` | Handler or interceptor |
| `sessionId` | UUID | When applicable |
| `errorCode` | `COST_CAP_EXCEEDED` | On errors only |

**NestJS:** use `Logger` or **pino** with `nestjs-pino` for JSON; set **redact** paths for tokens/passwords.

```typescript
// Example log line (conceptual)
{
  "level": "info",
  "time": 1712563200000,
  "msg": "session.simulate.completed",
  "correlationId": "a1b2c3d4-...",
  "requestId": "6f2c-...",
  "sessionId": "uuid",
  "durationMs": 38,
  "simVersion": 1,
  "dnf": false
}
```

**Don't:** log full allocation secrets, raw DB URLs, or **full** `Authorization` headers.

---

## Metrics (what to track)

| Metric | Type | Why |
|--------|------|-----|
| `Latency` | Histogram / p95 | SLO for UX |
| `5xxRate` | Percent | Reliability |
| `4xxRate` | Percent | Client vs server issues |
| `Throttles` | Count | API Gateway / Lambda limits |
| `DBConnectionErrors` | Count | Proxy / pool misconfig |
| `ColdStart` | Count (via init log) | Capacity planning |

**Implementation:** **EMF** (Embedded Metric Format) from Lambda, or **CloudWatch Lambda Insights** + custom metrics sparingly (cost).

**SLO starter (MVP):**

- **Availability:** 99.5% monthly (exclude client errors from “error budget” discussion).
- **Latency:** p95 **< 300ms** warm for simulate path.

---

## Alerts

| Alert | Condition | Channel |
|-------|-----------|---------|
| High 5xx | > 1% for 5 min | Pager / Slack |
| Latency | p95 > 1s for 10 min | Slack |
| Throttles | > 0 sustained | Slack |
| DB errors | spike | Pager |

**Don’t** page on single blips; use **minimum datapoints** to reduce noise.

---

## Debugging simulations

1. **Reproduce:** collect `sessionId`, `seed`, `simVersion`, input allocation from DB.
2. **Local script:** call same pure `simulateRace()` with same inputs—must match if deterministic.
3. **Feature flag:** `LOG_SIMULATION_DEBUG=true` logs **one** structured object per race (scores, key RNG draws)—never in default prod.

```typescript
if (process.env.LOG_SIMULATION_DEBUG === 'true') {
  logger.debug({ msg: 'sim.debug', seed, scores, dnfRoll: redactedOrBucketed });
}
```

---

## Security & secrets (operational)

- **SSM Parameter Store** SecureStrings; IAM least privilege; **no secrets in logs**.
- **Input validation:** global ValidationPipe (see `backend.md`); reject oversize payloads at API Gateway if needed (`max payload`).
- **Rate limiting (if needed):** API Gateway **throttling** per stage; or **WAF** rate rules for abuse; per-user limits require **DynamoDB token bucket** or API key + usage plan—add when public abuse appears, not day one unless mandated.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Include `correlationId` in error responses | Return stack traces to clients |
| Use structured `msg` strings for dashboards | Log human-only sentences with no machine key |
| Redact PII in logs | Store display names unredacted in verbose debug |
| Alert on sustained anomalies | Alert every 4xx |

---

## Trade-offs

| Choice | Pro | Con |
|--------|-----|-----|
| Pino JSON | Fast, grep-friendly | Slightly more setup |
| Many custom metrics | Visibility | Cost + noise |
| Gateway throttling only | Zero code | Coarse-grained |

---

*Related:* `backend.md`, `performance.md`, `database.md`
