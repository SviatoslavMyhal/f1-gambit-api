# F1 Gambit — Frontend: Multiplayer + Auth (Cursor / one-file copy)

**How to use:** Select all in this file (Cmd+A / Ctrl+A) → Copy → paste into Cursor or your FE repo agent.

This document is **self-contained** for: **JWT auth**, **battle lobbies** (invite code, config phase, head-to-head sim), **ELO leaderboard**, **multiplayer telemetry**, and **AI helper** endpoints. It assumes the same API conventions as `docs/FE_PROMPT.md` for single-player sessions/simulation.

---

## 1. Base URL & response envelope

- **Base:** `VITE_API_URL` / `NEXT_PUBLIC_API_URL` → e.g. `http://localhost:3000/api/v1` (no trailing slash).
- **Every successful JSON response:**

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

- **Envelope unwrap:** HTTP JSON is `{ success, data, timestamp }`. The resource you need is the inner **`data`** field (e.g. with `fetch`: `(await res.json()).data`; with Axios: `response.data.data` because Axios already uses `.data` for the HTTP body).
- **Auth:** send `Authorization: Bearer <accessToken>` on all protected routes below.
- **Errors:** Nest often returns `{ statusCode, message }` (sometimes `message` is an array or object for validation).

---

## 2. Auth

### Register (public)

`POST /auth/register`

Body:

```json
{
  "username": "engineer_1",
  "email": "you@example.com",
  "password": "secret123"
}
```

Validation (mirror in FE for UX):

- `username`: 3–20 chars, `^[a-zA-Z0-9_]+$`
- `email`: valid email
- `password`: min 8, must include at least one letter and one number

Success `data`:

```ts
{
  accessToken: string; // JWT, expires in 7 days (server-side)
  user: {
    id: string;
    username: string;
    email: string;
    rating: number;      // ELO-style, default ~1200
    wins: number;
    losses: number;
    racesCompleted: number;
  };
}
```

Duplicate username/email → **409** with message like `username already taken` / `email already taken`.

### Login (public)

`POST /auth/login`

```json
{
  "usernameOrEmail": "engineer_1",
  "password": "secret123"
}
```

Same `data` shape as register (`accessToken` + `user`). Invalid credentials → **401**.

### Current user (protected)

`GET /auth/me`

Headers: `Authorization: Bearer …`

`data`:

```ts
{
  id: string;
  username: string;
  email: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  racesCompleted: number;
}
```

**FE:** persist `accessToken` (memory + `localStorage` or httpOnly cookie if you add BFF later); attach Bearer on lobby, AI, users stats, multiplayer telemetry.

---

## 3. Types shared with lobby / AI

### `TireCompound` (string enum)

`SOFT` | `MEDIUM` | `HARD` | `INTER` | `WET`

### `CarSetupDto` (lobby config + AI advice)

All integers; enforce ranges in forms.

| Field | Min | Max | Notes |
|--------|-----|-----|--------|
| `frontWing` | 1 | 11 | |
| `rearWing` | 1 | 11 | |
| `suspensionStiffness` | 1 | 10 | |
| `brakeBias` | 52 | 66 | % front |
| `rideHeight` | 1 | 10 | |
| `differentialOnThrottle` | 50 | 100 | |
| `startingCompound` | enum | | `TireCompound` |
| `fuelLoad` | 0 | 5 | extra fuel laps / weight model |

### `RaceStrategyDto` (lobby submit — **compact** strategy)

Use this for **`POST /lobby/:id/config`**. The server maps it to the full internal `RaceStrategy` for the engine.

```ts
{
  startingCompound: TireCompound;     // should match setup or FE can sync from one control
  pitWindow: [number, number];       // [earliestLap, latestLap], two integers
  fuelLoad: number;                  // 0–5 (strategy field; aligns with setup semantics)
  aggressionLevel: number;           // 0–10 (0 save … 10 flat out)
  safetyCarReaction: 'pit' | 'stay';
}
```

**Important:** Server **overwrites** `setup.startingCompound` with `strategy.startingCompound` on submit. Keep them in sync in the UI or drive compound from strategy only.

### Lobby weather (assigned server-side on create)

`WeatherCondition`: `dry` | `mixed` | `wet`

### Lobby status (state machine)

`LobbyStatus`:

- `waiting` — host created; show **invite code**; opponent not joined.
- `configuring` — opponent joined; **config countdown** active; submit setup+strategy.
- `ready` — reserved in API; flow may jump to `simulating` quickly.
- `simulating` — race running (usually very short server-side).
- `finished` — show results; stop polling.
- `cancelled` — error / abandoned; stop polling.

---

## 4. Lobby API (all protected except none — all need JWT)

Base path: `/lobby`

### Create battle

`POST /lobby/create`

```json
{
  "configTimeLimitMinutes": 5
}
```

`configTimeLimitMinutes` optional; allowed: **1, 3, 5, 10** (default **5**).

`data`: lobby object including:

- `id` (UUID)
- `inviteCode` (6 chars, A–Z / 2–9, unambiguous)
- `status`
- `hostUserId`, `host` (user object)
- `opponentUserId`, `opponent` (null until joined)
- `configTimeLimitMinutes`, `configDeadline` (null until configuring)
- `trackId`, `track` (full track entity — use `track.slug`, `track.laps`, etc.)
- `weather`
- `simulationSeed` (number — informational; same seed both players)
- `hostReady`, `opponentReady`
- `hostConfig`, `opponentConfig` (null until submitted — internal shape includes full strategy)
- `winnerUserId`, `simulationResult` (when finished)
- `createdAt`, `updatedAt`
- **`configTimeRemainingSeconds`**: number **or** `null`. During **`configuring`**, server sends **seconds left** (0 when expired). Use for countdown UI.

### Join by code

`POST /lobby/join`

```json
{
  "inviteCode": "AB12CD"
}
```

Exactly **6** characters (case-insensitive; normalize to uppercase in UI).

Sets `status` to `configuring` and **`configDeadline`** = now + `configTimeLimitMinutes`.

Errors: not waiting, full lobby, joining own lobby → **400**.

### Submit car + strategy

`POST /lobby/:id/config`

```json
{
  "setup": { /* CarSetupDto */ },
  "strategy": { /* RaceStrategyDto */ }
}
```

Must be lobby **member**. Lobby must be **`configuring`**.

When **both** players have submitted, server auto-runs multiplayer sim (no extra “start” button required).

`data`: updated lobby wire (including `configTimeRemainingSeconds` when applicable).

### Poll lobby state (critical)

`GET /lobby/:id`

- **Poll every ~3s** while `status` is `waiting`, `configuring`, or `simulating`.
- **Side effect:** server runs **auto-start** logic: if deadline passed, missing configs are filled with **AI “balanced”** heuristics, then simulation runs on next poll.
- Stop polling when `finished` or `cancelled`.

Must be lobby **member**.

### Results (finished only)

`GET /lobby/:id/results`

Member only. **`400`** if not `finished`.

`simulationResult` in lobby (in `data`) is a **slim** JSON (no embedded telemetry blobs). Expect roughly:

```ts
{
  winner: string | null;        // userId or null if draw
  gapSeconds: number;
  host: { userId: string; result: { /* engine summary without telemetry */ } };
  opponent: { userId: string; result: { /* same */ } };
  trackSlug: string;
  /** Sector lengths in km, ordered S1–S3 (from track metadata). Map UIs can combine with per-lap sector times for distance-weighted scrub. */
  trackSectorLengthKm: number[];
  weather: WeatherCondition;
  seed: number;
  simulatedAt: string;
  ratingChanges?: { userId: string; delta: number; newRating: number }[];
}
```

Each `host.result` / `opponent.result` includes the usual engine summary fields **plus** compact lap rows (telemetry blob is stripped):

```ts
laps: {
  lap: number;
  timeSeconds: number;
  /** S1–S3 in seconds when available (aligned by lap index with sector splits from the sim). */
  sectors?: [number, number, number];
}[];
```

Use `winner`, `gapSeconds`, `ratingChanges`, `laps`, and `trackSectorLengthKm` for map scrubbers; full overlays still use the multiplayer telemetry endpoint.

---

## 5. Multiplayer telemetry (protected)

`GET /telemetry/multiplayer/:lobbyId`

**Must** be lobby member. **Register this route mentally:** it is **`multiplayer/...`**, not `:sessionId`, so it does not collide with `GET /telemetry/:sessionId`.

`data`:

```ts
{
  host: SessionTelemetry;      // same rich shape as single-player telemetry
  opponent: SessionTelemetry;
  lapDeltaComparison: {
    lap: number;
    hostTime: number | null;
    opponentTime: number | null;
    delta: number;              // positive ⇒ host faster that lap (lower time)
  }[];
  tireWearComparison: {
    lap: number;
    hostWear: number | null;
    opponentWear: number | null;
  }[];
  sectorDeltaComparison: {
    lap: number;
    hostS1: number;
    hostS2: number;
    hostS3: number;
    opponentS1: number | null;
    opponentS2: number | null;
    opponentS3: number | null;
  }[];
}
```

Use **`SessionTelemetry`** chart patterns from `FE_PROMPT.md` (lap times, tireData, sectorSplits, events, etc.) for dual overlays or side-by-side.

---

## 6. AI helper (protected)

Base: `/ai`

### Full heuristic config (setup + strategy)

`POST /ai/config`

```json
{
  "trackSlug": "spa",
  "weather": "dry",
  "personality": "balanced"
}
```

`personality` optional: `aggressive` | `balanced` | `conservative` | `random`

`weather`: `dry` | `mixed` | `wet`

`data`: **`PlayerConfig`**-like object:

```ts
{
  userId: string;              // current user
  setup: CarSetupDto;
  strategy: RaceStrategy;       // full engine strategy (not the DTO) — use as reference or map to form fields
  submittedAt: string;          // ISO
}
```

Use to pre-fill lobby forms or “copy AI suggestion”. For **`POST /lobby/:id/config`** you still send **`RaceStrategyDto`**, not the full `RaceStrategy` (unless you add a mapper on the FE).

### Advice vs current setup

`POST /ai/advice`

```json
{
  "trackSlug": "spa",
  "weather": "dry",
  "currentSetup": { /* CarSetupDto */ }
}
```

`data`:

```ts
{
  overallAssessment: string;
  suggestions: Array<{
    parameter: string;
    current: unknown;
    suggested: unknown;
    reason: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
}
```

Suggestions only for parameters differing from **balanced** baseline by more than **1** (numeric) or any enum mismatch.

---

## 7. User stats (protected)

`GET /users/:id/stats`

`data`:

```ts
{
  id: string;
  username: string;
  email: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  racesCompleted: number;
  winRate: number;              // 0–100 integer
  recentResults: Array<{
    lobbyId: string;
    trackSlug: string | null;
    winnerUserId: string | null;
    wasHost: boolean;
    finishedAt: string;         // ISO
  }>;
}
```

---

## 8. ELO leaderboard (public)

`GET /leaderboard/ratings?limit=50`

`limit` optional; server caps (e.g. top **50**).

`data`: array of users:

```ts
Array<{
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  racesCompleted: number;
}>
```

(`draws` may be omitted in list projection — treat as optional.)

---

## 9. Recommended FE flows

### A. Onboarding

1. Register or login → store `accessToken`.
2. `GET /auth/me` to hydrate profile (rating, record).

### B. Host a battle

1. `POST /lobby/create` → show **invite code** + share UI.
2. Poll `GET /lobby/:id` every **3s** until opponent joins (`configuring`).

### C. Join a battle

1. `POST /lobby/join` with code → land on lobby `configuring`.
2. Poll `GET /lobby/:id` every **3s**.

### D. Config phase

1. Show **countdown** from `configTimeRemainingSeconds` (only meaningful in `configuring` with deadline).
2. Optional: `POST /ai/advice` or `POST /ai/config` to help user.
3. `POST /lobby/:id/config` with `{ setup, strategy }`.
4. Continue polling until `simulating` then `finished` (or handle deadline: server may auto-fill missing side via AI on poll).

### E. Results

1. When `finished`, stop polling.
2. `GET /lobby/:id/results` for slim summary + rating deltas.
3. `GET /telemetry/multiplayer/:lobbyId` for charts / lap comparison.

### F. Profile & rankings

1. `GET /users/:id/stats` for profile + recent multiplayer rows.
2. `GET /leaderboard/ratings` for global ELO table.

---

## 10. UX checklist (quality gates)

- [ ] Register/login validation matches server rules; show **409** conflicts clearly.
- [ ] All multiplayer routes send **Bearer** token.
- [ ] Lobby polling **stops** on `finished` / `cancelled`.
- [ ] Invite code input: length **6**, uppercase, allowed charset.
- [ ] Config submit uses **`RaceStrategyDto`** + **`CarSetupDto`**; keep **starting compound** consistent (server trusts strategy for compound).
- [ ] Countdown uses **`configTimeRemainingSeconds`** from poll response.
- [ ] Results page handles **`winner === null`** (draw).
- [ ] Telemetry dual view uses **`lapDeltaComparison`** / full **`host`/`opponent`** telemetry as needed.

---

## 11. Swagger

If backend runs with docs enabled: **`GET /api/docs`** (not under `/api/v1`). Use it to confirm request bodies and try JWT **Authorize** for protected routes.

---

## 12. Relation to single-player (`FE_PROMPT.md`)

- Sessions, **`POST /sessions/:id/setup`**, **`POST /sessions/:id/simulate`**, and **`GET /telemetry/:sessionId/...`** remain for **solo** engineer mode.
- Multiplayer **does not** use session simulation for the battle; the lobby runs **`SimulationService.runMultiplayer`** server-side. You may still reuse **CarSetupDto** UI components and chart components for telemetry shape overlap.
