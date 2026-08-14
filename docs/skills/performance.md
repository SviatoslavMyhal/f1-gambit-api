# Performance & Scalability — Constructor's Gambit API

**Scope:** AWS Lambda, RDS Proxy, esbuild, p95/p99 latency, MVP constraints (5–7 days).

---

## Principles

1. **Measure before caching.** Target **< 300ms** for interactive simulate/allocate paths at warm; know your p95 before adding Redis.
2. **Cold start is a feature budget.** Fewer deps, smaller bundle, init outside the handler.
3. **DB time dominates** if queries are sloppy—Proxy helps connections; **query shape** helps latency.

---

## Lambda cold start mitigation

| Technique | Action |
|-----------|--------|
| **Bundle** | esbuild tree-shake; exclude `aws-sdk` v2 if using v3 modular imports only |
| **Init once** | Create `DataSource`, config clients, logger formatters in global scope |
| **Avoid VPC** for Lambda **if** DB is public (not recommended) — for **private RDS**, VPC is required: **minimize** subnet hops, use **RDS Proxy** in same VPC, keep **ENI** cold start in mind (provisioned concurrency if budget allows) |
| **Provisioned concurrency** | Optional for demo/prod steady UX; cost trade-off |

```typescript
// lambda.ts pattern
let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverless(expressApp);
}

export const handler: Handler = async (event, context, callback) => {
  server ??= await bootstrap();
  return server(event, context, callback);
};
```

**MVP:** accept occasional cold start > 300ms; document for UI (skeleton state). **Iterate** toward provisioned concurrency if product requires.

---

## RDS Proxy + connection pooling

- Lambda opens **few long-lived connections** through Proxy; Proxy pools to DB.
- Set **IAM DB auth** optionally to rotate passwords; still cap concurrent Lambdas vs DB size.
- **Idle timeout:** align client `idle_in_transaction_session_timeout` and ORM pool settings with Proxy defaults.

**TypeORM:** use `extra` for SSL against RDS; connection string from SSM.

```typescript
// database.config.ts (illustrative)
export const typeOrmModuleOptions = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: process.env.ORM_LOGGING === 'true',
  extra: {
    max: 2, // per Lambda container; Proxy aggregates
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: true },
  },
});
```

---

## Avoiding N+1 queries

- Use **`relations`** only when needed; prefer explicit `QueryBuilder` with joins for hot paths.
- **Leaderboard:** one query with `ORDER BY score LIMIT 50`—no per-row session fetch unless required.
- **Session detail:** load session + latest allocation in one query (subquery or lateral join).

```typescript
// Good: single round trip
const rows = await this.repo
  .createQueryBuilder('s')
  .leftJoinAndSelect('s.allocations', 'a', 'a.id = (SELECT id FROM allocations WHERE session_id = s.id ORDER BY submitted_at DESC LIMIT 1)')
  .where('s.id = :id', { id })
  .getOne();
```

---

## Caching strategies (when applicable)

| Layer | Use when | Caution |
|-------|----------|---------|
| **API Gateway** | Rare; mostly auth caching | Stale data |
| **CloudFront** | GET leaderboard if tolerable staleness | Invalidate on new submit or short TTL |
| **ElastiCache / in-memory** | Repeated identical simulate (unusual) | Complexity for MVP—skip unless measured |
| **Client-side** | Session + last result | Source of truth still server |

**MVP default:** **no** Redis; rely on fast SQL + indexes.

---

## p95 latency targets

| Path | Target (warm) | How |
|------|----------------|-----|
| Health | < 50ms | No DB |
| GET session | < 100ms | Indexed PK |
| Simulate | < 300ms | Pure CPU sim + 1–2 short transactions |

**Achieve:**

- Minimize JSON serialization depth; avoid huge `raw` blobs in hot responses.
- **Connection reuse** (global DataSource).
- **No synchronous external HTTP** in request path for MVP.

---

## CI/CD, build, Terraform (performance-related)

- **esbuild** for single-file or few chunks; externalize only what Lambda layer provides if used.
- **Tree-shake** Nest by importing modules explicitly; avoid barrel files that pull entire packages.
- **Terraform:** separate `dev` / `prod` state; **no** shared DB between envs for performance isolation and safety.
- **Deployments:** blue/green or alias traffic shift for Lambda if zero-downtime required; MVP often **single version** with quick rollback script.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Load SSM parameters once at init | Resolve secrets per request |
| Keep handler return payload small | Return full audit JSON to mobile client by default |
| Run load tests on staging with Proxy | Test against raw RDS from 1000 fake Lambdas without Proxy |
| Set `max` pool per instance low | Open unlimited connections per invocation |

---

## Trade-offs

| Choice | Pro | Con |
|--------|-----|-----|
| VPC Lambda + private RDS | Secure | Cold start + ENI setup time |
| No cache MVP | Simpler ops | May need CloudFront later for leaderboard |
| Single AZ RDS MVP | Cheaper | Less HA |

---

*Related:* `database.md`, `observability.md`, `api.md`
