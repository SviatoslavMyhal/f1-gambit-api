# f1-gambit-api

NestJS API for F1-style budget / setup simulation and **multiplayer lobbies** (head-to-head).

## Race results & data sources

Multiplayer **`simulationResult`** (on finished lobbies) uses **simulated** sector times, per-driver **sector heatmaps** (3 rows × one column per lap), and a merged **events** timeline derived from both drivers’ telemetry plus synthetic `LEAD_CHANGE` markers. See **[docs/ADR-001-race-data-sources.md](docs/ADR-001-race-data-sources.md)** for comparison of OpenF1, Jolpica/Ergast, pure simulation, and hybrid “flavor” options.

Example payload: **[docs/examples/finished-lobby-simulation-result.json](docs/examples/finished-lobby-simulation-result.json)**.

### Clipboard export

`GET /api/v1/lobby/:id/summary-export` (JWT, finished lobby) returns `{ plainText, json }` for one-click copy on the client.

## Local Postgres (Docker)

When another Postgres already listens on **`localhost:5432`**, start this project’s DB with:

```bash
docker compose up -d postgres
```

The Gambit Postgres service maps host port **`5434`** → container `5432` (override with `GAMBIT_PG_PORT` in compose). Your **`.env.local`** should include **`DB_PORT=5434`** (see `.env.local.example`). User/password/database **`gambit` / gambit / gambit`** match `docker-compose.yml`.

After the container is up: `npm run migration:run` (loads `src/database/data-source.ts`; set `DB_PORT`/`DB_*` in the environment if you do not rely on `.env`).

---

## Local SPA + CORS

The global HTTP prefix is **`/api/v1`** (canonical). For compatibility, **`/api/auth/login`**, **`/api/auth/register`**, and **`/api/auth/me`** are rewritten to **`/api/v1/auth/...`** via middleware (prefer updating the client base URL when possible).

Browsers sending `Origin` from Vite (`http://localhost:5173`) get CORS when `NODE_ENV !== 'production'`. If you run with **`NODE_ENV=production`** locally but still need a browser SPA, set **`CORS_ORIGINS`** (comma-separated exact origins, e.g. `http://localhost:5173`) to force CORS on. Optionally add **`X-Correlation-Id`** / **`X-Request-Id`** headers; both are listed in **`Access-Control-Allow-Headers`** (see `src/common/cors-non-production.ts`).
