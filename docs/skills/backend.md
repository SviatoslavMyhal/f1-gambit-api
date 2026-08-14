# Backend Engineering Standards — Constructor's Gambit API

**Scope:** NestJS + TypeScript (strict), Lambda-first, decision engine + simulation—not CRUD-as-default.

---

## Principles

1. **Boundaries beat cleverness.** Controllers translate HTTP ↔ DTOs; services own use cases; pure functions own simulation math. Infrastructure (DB, config) stays at the edges.
2. **Fail with intent.** Every error maps to a stable HTTP shape and a log line with `correlationId` + `code`—never raw stack traces to clients.
3. **MVP speed, extension hooks.** Prefer interfaces and small modules over frameworks inside frameworks; defer abstractions until the second real consumer.

---

## Code structure

| Layer | Responsibility | Allowed dependencies |
|-------|----------------|----------------------|
| **Controller** | Routing, guards, DTO validation trigger | Services, pipes, decorators |
| **Service** | Orchestration, transactions, calling domain/simulation | Repositories, other services, domain helpers |
| **Domain / simulation** | Pure logic, no Nest imports | Only types, math, seeded RNG utilities |
| **Entity / repository** | Persistence mapping | TypeORM, DB types only in data layer |

**Module layout (feature-first):**

```
src/
  common/           # filters, interceptors, pipes, logger, config
  database/         # data-source, migrations, base entities if any
  modules/
    sessions/
    budget/
    simulation/
    leaderboard/
```

Each feature module exports what others need; keep **circular imports forbidden**—use `forwardRef` only as a last resort and document why.

---

## Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `budget-allocation.dto.ts` |
| Classes | PascalCase | `SimulationService` |
| Methods | camelCase, verb-first | `runRace`, `validateCostCap` |
| DTOs | suffix `Dto` | `CreateSessionDto` |
| Entities | noun, no suffix noise | `Session`, `RaceResult` |
| Env vars | SCREAMING_SNAKE | `DATABASE_URL` |

**URLs:** plural nouns, kebab-case path segments: `/sessions`, `/sessions/:id/allocations`.

---

## DTO validation strategy

- **class-validator** + **class-transformer** on all ingress DTOs; `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` in production.
- Validate **ranges** (budget sliders): min/max, sum constraints, integer vs float policy—document in DTO decorators.
- **Output:** use explicit response types or serializer DTOs; never return raw entities with internal fields.

```typescript
// dto/budget-allocation.dto.ts
import { IsInt, Min, Max, IsArray, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AxisAllocationDto {
  @IsInt() @Min(0) @Max(100)
  aeroPct!: number;

  @IsInt() @Min(0) @Max(100)
  powerPct!: number;
  // ... other axes; enforce sum in a custom @Validator or service
}

export class SubmitAllocationDto {
  @ValidateNested()
  @Type(() => AxisAllocationDto)
  allocation!: AxisAllocationDto;
}
```

```typescript
// configure-app.ts (excerpt)
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

---

## Error handling

**Domain errors:** small hierarchy, map in a global filter to HTTP.

```typescript
// common/errors/domain.error.ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class CostCapExceededError extends DomainError {
  constructor(allocated: number, cap: number) {
    super('COST_CAP_EXCEEDED', `Allocation ${allocated} exceeds cap ${cap}`, 422, {
      allocated,
      cap,
    });
  }
}
```

```typescript
// common/filters/domain-exception.filter.ts
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId = req.headers['x-correlation-id'] ?? randomUUID();

    // structured log here (see observability skill)
    res.status(exception.httpStatus).json({
      error: {
        code: exception.code,
        message: exception.message,
        meta: exception.meta,
      },
      correlationId,
    });
  }
}
```

**Do:** use `DomainError` (or subclasses) for expected failures; let unknown errors bubble to a generic 500 handler with sanitized body.

**Don't:** throw plain `Error` for business rules; don't leak `constraint` names from Postgres to clients.

---

## Logging (Lambda / structured)

- One **JSON line per log event**; include `level`, `message`, `timestamp`, `correlationId`, `requestId` (Lambda), `route`, `durationMs` where applicable.
- **Debug** simulation internals only behind `LOG_SIMULATION_DEBUG=true` or sample rate—avoid log volume killing CloudWatch costs.

```typescript
// Prefer a thin wrapper
this.logger.log({
  msg: 'allocation.submitted',
  sessionId,
  correlationId,
  costCapRemaining: remaining,
});
```

**Don't:** `console.log` large objects or per-tick simulation state in hot paths.

---

## Security & secrets (summary)

- **SSM Parameter Store** (SecureString) for DB URL, API keys; load at cold start, cache in module scope—never commit secrets.
- **Least privilege** IAM for Lambda (SSM read only for prefix `/app/${env}/`).
- See deployment notes in `performance.md` / infra README for env separation.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Keep simulation pure + testable | Put TypeORM queries inside pure `simulateRace()` |
| Return stable error `code` strings | Change error shapes between releases without version bump |
| Use `correlationId` from header or generate | Rely solely on Lambda requestId for user support flows |
| Document cost-cap rules next to validation | Encode rules only in Terraform or only in UI |

---

## Architecture decisions & trade-offs

| Decision | Reason | Trade-off |
|----------|--------|-----------|
| Feature modules | Team scaling, clear ownership | Slight duplication vs shared “god” module |
| Domain errors → HTTP in filter | Single mapping point | Must maintain code catalog for API docs |
| Strict DTO validation at edge | Fail fast, less defensive code inside | Slightly more boilerplate |
| No ORM in domain layer | Testability, swap DB later | Manual mapping entity ↔ domain model |

---

## CI/CD expectations (backend slice)

- **Lint + typecheck + unit tests** on every PR; simulation tests must run without DB when possible (mock repo).
- Build artifact: **esbuild** bundle for Lambda (see `performance.md`).
- Terraform **plan** on PR for infra repos; apply gated on main with approval for prod.

---

*Related:* `simulation.md`, `api.md`, `database.md`, `performance.md`, `observability.md`
