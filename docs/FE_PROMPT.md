# F1 Gambit — Frontend (Cursor) — full prompt · one-file copy

**How to use:** Open this file → **Select All** (Cmd+A / Ctrl+A) → **Copy** → paste into a new Cursor chat or your FE repo’s agent.

---

## 1. What changed on the backend (you must align the FE)

The API is now a **Race Engineer Simulation Platform**, not a simple “budget %” mini-game.

| Old | New |
|-----|-----|
| `POST /sessions/:id/budget` (6 numbers summing to 100) | **`POST /sessions/:id/setup`** with **`CarSetupDto`** (wings, suspension, brakes, tires, fuel, etc.) |
| `POST /sessions/:id/simulate` with optional `{ seed? }` only | **`POST /sessions/:id/simulate`** **requires** **`trackSlug`** + **`strategy`** (+ optional `setup`, `seed`). Session must have **`playerName`** and a **saved setup** (or pass **`setup` in body**). |
| One generic “simulation result” | **`data.result`** + **`data.telemetry`** (telemetry-grade structures for charts). |
| No first-class tracks | **`GET /tracks`**, **`GET /tracks/:slug`**, **`GET /tracks/:slug/strategies`** |
| No telemetry API | **`GET /telemetry/:sessionId/...`** (pre-shaped for **Recharts**) |
| Telemetry = lap times + basic traces | **`SessionTelemetry`** also includes **`advancedLaps`** + **`telemetryStream`** (race-engineering metrics — see **§13**) |
| Response `{ success, data }` only | Response **`{ success, data, timestamp }`** — show or ignore **`timestamp`**. |

**Legacy:** `budgetAllocation` may still exist on old sessions; **do not** build the primary flow on it. **Use `carSetup`** and the setup endpoint.

---

## 2. Base URL & response envelope

- **Base:** `VITE_API_URL` / `NEXT_PUBLIC_API_URL` → e.g. `http://localhost:3000/api/v1` (no trailing slash).
- **Every JSON response:**

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

- **Always read `response.data`** (or unwrap in your API client once).
- **Errors:** use your existing pattern (4xx/5xx + body); Nest may return `{ statusCode, message }`.

---

## 3. Recommended installs (frontend)

Use your stack’s package manager.

**Charts (telemetry is designed for these):**

```bash
npm install recharts
# optional: npm install @tanstack/react-query
```

- **Recharts** — line/bar/radar/area for the endpoints below (data shapes match chart needs with **minimal** transforms).
- **TanStack Query** (optional) — caching, retries, stale-while-revalidate for `GET` tracks / telemetry.

No extra BE packages on the FE.

---

## 4. Mental model for UX copy & IA

- User = **race engineer**: car **setup** (aero, mechanical, brakes, tires, fuel), **circuit**, **race strategy** (stints, pit windows), then **run** the **full-distance sim** (engine v2).
- After the run: **telemetry** drives **degradation curves**, **lap deltas**, **sector radar**, **speed trace**, **event timeline**.
- **Leaderboard** score is **derived from the new race sim** (time-based scoring on the API); treat **`score`** as comparable **higher = better** unless you document otherwise.

---

## 5. API reference (current)

### Sessions

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/sessions` | Body optional: `playerName`, `seasonYear`, `compareConstructorRef`, `opponentConstructorRef`, `strategyMetrics` |
| `GET` | `/sessions/:id` | Session includes **`carSetup`**, **`simulationResult`**, **`finalScore`**, status, etc. |
| `PATCH` | `/sessions/:id` | Update profile / refs / **`strategyMetrics`** sliders |
| `GET` | `/sessions/meta/opponents` | `[{ ref, label }]` AI opponent **presets** (meta for copy / filters) |

### Car setup (replaces budget)

| Method | Path | Body |
|--------|------|------|
| `POST` | `/sessions/:id/setup` | **`CarSetupDto`** (see §6) |

Returns something like: `{ setup, validationWarnings, strategyRecommendations }` inside **`data`**.

### Tracks & strategy suggestions

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/tracks` | All circuits (seeded on server). |
| `GET` | `/tracks/:slug` | One track (`slug` e.g. `monaco`, `monza`, `spa`, `silverstone`, `suzuka`, `interlagos`, `bahrain`, `singapore`). |
| `GET` | `/tracks/:slug/strategies` | **Array of 3 `RaceStrategy` variants** (aggressive / balanced / conservative) — use one as default or let user pick. |
| `GET` | `/tracks/:slug/references` | Per-circuit **reference profiles** (archetypes, session kind, sector norms, straight top-speed benchmark, suggested **setupPreset** for side-by-side vs player). Use ids on **`compareToReferenceIds`** or set **`compareAllReferences: true`**. |

### Simulation (engine v2)

| Method | Path | Body |
|--------|------|------|
| `POST` | `/sessions/:id/simulate` | **Required:** `trackSlug`, **`strategy`**. **Optional:** `setup`, `seed`, **`gridSize`** (2–22, default 20), **`compareToReferenceIds`**, **`compareAllReferences`** (boolean — compare every profile for this track). |

**Prerequisites:** **`playerName`** set on session; **`carSetup`** saved via **`POST .../setup`** **or** pass **`setup`** in this body.

**Success `data` shape (conceptually):**

```ts
{
  result: {
    engineVersion: 2,
    totalRaceTimeSeconds: number,
    bestLapSeconds: number,
    finalPosition: number,       // 1-based vs full grid
    points: number,              // F1 table for P1–P10, else 0
    trackSlug: string,
    gridSize: number,
    playerPosition: number,      // same as finalPosition
    resultMode: 'grid',          // competitive grid vs AI field (not a guaranteed win)
    raceTopFinishers: { position: number; label: string; totalRaceTimeSeconds: number; isPlayer: boolean }[],
    exportSummary: { schemaVersion, seed, trackSlug, setupFingerprint, finalPosition, points, totalRaceTimeSeconds, bestLapSeconds, comparedReferenceIds },  // copy / Discord / debug
    closestReferenceMatch?: { referenceId, marketingLabel, absDeltaTotalSeconds },  // “closest benchmark” headline
    referenceComparisons?: Array<{
      referenceId, label, marketingLabel, archetype, sessionKind, setupPreset,
      deltaTotalSeconds, deltaBestLapSeconds, deltaSectorSumSeconds,
      referenceSectorNormsSeconds, deltaSectorSeconds?, deltaTopSpeedStraightKph?, referenceTopSpeedKph
    }>,
    unmatchedReferenceIds?: string[],
    session: Session,
    simWallTimeMs: number
  },
  telemetry: SessionTelemetry
}
```

**Ranking:** `finalPosition` / `points` come from sorting **your** simulated race time against **(gridSize − 1)** AI rivals whose pace is anchored to per-track **reference** targets — faster runs rank higher; **different seeds or setups can yield non-P1.**

**References (product story):** same **track**, comparable **session types** (quali vs race trim). Labels are **benchmarks / archetypes**, not licensed drivers. Show **Δ** (total, best lap, sector sum, longest-straight top speed when telemetry allows). **setupPreset** supports a side-by-side with **CarSetupDto** — “your knobs vs reference style.” Use **`exportSummary`** + **`JSON.stringify(result)`** for a copy button.

### Telemetry (chart-ready)

All under **`/telemetry/:sessionId`** (session UUID).

| Method | Path | Use for |
|--------|------|---------|
| `GET` | `/telemetry/:sessionId` | Full **`SessionTelemetry`** |
| `GET` | `/telemetry/:sessionId/degradation-curve` | **LineChart** — tire wear / grip vs lap |
| `GET` | `/telemetry/:sessionId/lap-delta` | **BarChart** — delta vs best lap |
| `GET` | `/telemetry/:sessionId/sector-performance` | **RadarChart** — best/avg/worst per sector |
| `GET` | `/telemetry/:sessionId/speed-trace` | **AreaChart** — corner speeds |
| `GET` | `/telemetry/:sessionId/events` | Timeline — pits, SC, lock-up, fastest lap, etc. |

**Advanced telemetry (same `GET /telemetry/:sessionId` — no extra route):** when present, use **`data.advancedLaps`** and **`data.telemetryStream`** for engineering dashboards (§13).

### Leaderboard

| Method | Path |
|--------|------|
| `GET` | `/leaderboard?limit=20` |
| `POST` | `/leaderboard` | Manual submit: `{ sessionId, playerName, score, meta? }` |

Row: `rank`, `playerName`, `score`, `sessionId`, `meta` (may include `trackSlug`, `engineVersion`, opponent meta, etc.).

### F1 reference data (cached on server)

| Method | Path |
|--------|------|
| `GET` | `/f1-data/standings/drivers?season=2024` |
| `GET` | `/f1-data/standings/constructors?season=2024` |
| `GET` | `/f1-data/race-results?season=2024&round=1` |
| `GET` | `/f1-data/circuits` |

### OpenF1 proxy (optional polish)

| Method | Path |
|--------|------|
| `GET` | `/openf1/{resource}?…` | Forwards query to `https://api.openf1.org/v1/{resource}?…` (e.g. `meetings`, `sessions`, `drivers`, `laps`). |

### Legacy `/f1/...` routes

Still available (seasons, schedule, etc.) — use if you already wired them.

---

## 6. `CarSetupDto` — exact fields (validation mirrors backend)

All integers where noted; enums as **strings**.

- **`frontWing`**: 1–11  
- **`rearWing`**: 1–11  
- **`suspensionStiffness`**: 1–10  
- **`brakeBias`**: 52–66 (% to front axle)  
- **`rideHeight`**: 1–10  
- **`differentialOnThrottle`**: 50–100  
- **`startingCompound`**: `"SOFT"` \| `"MEDIUM"` \| `"HARD"` \| `"INTER"` \| `"WET"`  
- **`fuelLoad`**: 0–5 (laps of fuel above minimum — product language on FE)

**UI suggestion:** group into **Aero**, **Mechanical**, **Brakes**, **Tyres**, **Fuel**; show **validation warnings** from **`POST .../setup`** response.

---

## 7. `RaceStrategy` — what FE must send to `/simulate`

Must match backend expectations (stints, pit windows, numbers). **Easiest path:** call **`GET /tracks/:slug/strategies`**, let user pick one of the three, and **send that object** as **`strategy`** on **`POST /simulate`**.

Typical fields (conceptual):

- `stints[]`: stint index, compound, start/target laps, `pushMode`  
- `pitWindows[]`: earliest, latest, optimal, undercut/overcut flags  
- `targetLapTime`, `underFuelThreshold`

If you build a custom strategy editor later, keep the same JSON shape the API accepts.

---

## 8. Suggested user flow (screens)

1. **Welcome** — CTA → continue  
2. **Name** — `POST /sessions` with `playerName` → store **`sessionId`** (`localStorage` + state)  
3. **Car setup** — form → `POST /sessions/:id/setup` → show warnings + recommendations  
4. **Track** — `GET /tracks` → user picks → optional detail `GET /tracks/:slug`  
5. **Strategy** — `GET /tracks/:slug/strategies` → user picks variant (or default balanced)  
6. **Run** — `POST /sessions/:id/simulate` with `{ trackSlug, strategy, seed? }` → loading (“race” progress UI)  
7. **Results** — summary from **`data.result`**  
8. **Telemetry** — parallel fetch chart endpoints or full `GET /telemetry/:sessionId`  
9. **Leaderboard** — `GET /leaderboard`  

**Empty leaderboard:** only fills after a **successful** simulate with valid **name** + **setup** + **simulate** body.

---

## 9. UI / UX direction (F1 broadcast quality)

- **Dark-first**, one strong accent (red / green / gold), **condensed** headline font + readable body.  
- **Telemetry pages** should feel like **garage / race control**: grids, sector bars, subtle motion, no generic “AI gradient” look.  
- **Accessibility:** contrast, focus states, `prefers-reduced-motion`.  
- **Mobile:** stack setup controls; sticky primary CTA where helpful.

---

## 10. Environment & CORS

- FE dev server: e.g. `http://localhost:5173` — backend should allow CORS in **non-production** (already typical for this API).  
- Set **`VITE_API_BASE_URL`** / **`NEXT_PUBLIC_API_BASE_URL`** to `http://localhost:3000/api/v1`.

---

## 11. Checklist before shipping FE

- [ ] No calls to removed **`/budget`** routes — use **`/setup`** only.  
- [ ] **`POST /simulate`** always sends **`trackSlug`** + **`strategy`**.  
- [ ] **`playerName`** set before simulate.  
- [ ] Charts consume **telemetry** endpoints without heavy reshaping.  
- [ ] Handle **422** from simulate (missing name / missing setup).  
- [ ] Display **`timestamp`** optional (debug / “last sync”).  

---

## 12. One-line instruction for Cursor

**“Implement the F1 Gambit frontend using `VITE_API_BASE_URL` pointing at `/api/v1`, unwrap `{ success, data, timestamp }`, follow the flow in §8, use Recharts on telemetry endpoints in §5, replace any legacy budget UI with `CarSetupDto` + `POST /sessions/:id/setup`, and style everything per §9.”**

---

## 13. Advanced telemetry (new) — what to build & how it maps to API

After **`POST /simulate`**, **`data.telemetry`** (and persisted **`GET /telemetry/:sessionId`**) may include:

| Field | Purpose | UI ideas |
|--------|---------|----------|
| **`advancedLaps[]`** | Per lap: sector deltas vs best, mini-sector splits, **`driverMetrics`** (aggression, throttle smoothness, consistency, mistake probability), tire temps (inner/middle/outer), overheating flag, top speed / accel zones | **Lap table** with expandable row → sector bars; **sparklines** for driver metrics over race; **heat strip** for tire temps |
| **`telemetryStream[]`** | Downsampled trace: speed, throttle/brake 0–1, lateral/long **G**, slip angle, brake temp, tire wear, grip, IMO tire temps | **Multi-series line chart** vs lap or vs `trackPosition` (synced cursors); throttle/brake as **filled area** (green/red) like broadcast overlays |
| **`tireData[]`** (extended) | `tireWearPerLap`, `tireWearPerCornerAvg`, `tireTemperature`, `overheating` | Stacked with degradation curve; **warning badge** when `overheating` |
| **`speedTrace[]`** (extended) | `lateralG`, `longitudinalG`, `slipAngleDeg`, `brakeTemperatureC` | Corner table or **small multiples** per corner |
| **`events[]`** (extended) | `WHEEL_SPIN`, `DIRTY_AIR_LOSS`, `DRS_ACTIVATION` | Icons on lap-delta chart; filter chips |

**Types:** mirror backend `src/modules/telemetry/telemetry.types.ts` in your FE (`AdvancedLapTelemetry`, `TelemetrySamplePoint`, extended `RaceEventTelemetry`).

**Defensive coding:** treat **`advancedLaps`** / **`telemetryStream`** as **optional** (`?.`) so older saved sessions still render.

---

## 14. Cursor prompt — advanced telemetry UI (paste into a new chat)

Use this block as the **full instruction** for implementing / upgrading the results + telemetry screens.

```text
You are implementing the post-race telemetry experience for F1 Gambit (React or Next + Vite).

Goals:
1) Consume SessionTelemetry from GET /telemetry/:sessionId (same shape as POST /simulate response data.telemetry).
2) Add an "Engineering" or "Telemetry" tab on the results view with credible F1 race-engineering UX: dark theme, dense but readable, motorsport typography (e.g. a condensed headline font + system UI for body).
3) Visualize when present: telemetry.advancedLaps (per-lap driver metrics, sector deltas, tire temps, overheating), telemetry.telemetryStream (speed, throttle, brake, lateralG, longitudinalG, slipAngleDeg, brakeTemperatureC, gripLevel, tire temps vs lap or trackPosition).
4) Extend the existing events timeline to show WHEEL_SPIN, DIRTY_AIR_LOSS, DRS_ACTIVATION with distinct icons and tooltips.
5) Optional: export — "Copy telemetry JSON" button using navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2)) with user feedback (toast).
6) Keep bundle lean: prefer Recharts for charts; optional @tanstack/react-query for GET caching.
7) Accessibility: keyboard focus on chart containers, sufficient contrast, aria-labels on icon-only buttons.
8) If advancedLaps or telemetryStream is missing, hide engineering sections gracefully (older sessions).

Do not assume engineVersion; do not call removed /budget routes. Use carSetup + simulate flow from the project API docs.
```

---

## 15. What to change when the backend updates again

- **Bump** local TypeScript types from **`telemetry.types.ts`** (or regenerate OpenAPI if you add it later).
- **Grep** for `advancedLaps`, `telemetryStream`, `RaceEventTelemetry` — ensure switches handle **new event types**.
- **Snapshot / E2E:** simulate once, assert `telemetry.advancedLaps?.length === totalLaps` when engine ships full laps.
- **Performance:** `telemetryStream` is bounded (~3 samples × laps); still use **memoized** chart data and avoid re-parsing huge JSON on every render.
- **Feature flag (optional):** `if (telemetry.advancedLaps?.length) show EngineeringTab` — safe rollout.

---

## 16. Recommended frontend packages (install as needed)

**Core (already suggested):**

- `recharts` — line, area, composed charts for telemetry traces and lap deltas.
- `@tanstack/react-query` (optional) — cache `GET /telemetry/:id` after simulate.

**Polish (pick what fits your stack):**

- `framer-motion` — subtle tab transitions / staggered reveal (respect `prefers-reduced-motion`).
- `date-fns` — only if you format `timestamp` from API responses.

**Avoid** pulling a second heavy chart library unless you need WebGL; Recharts is enough for this payload size.

---

## 17. Credible UI / UX references (inspiration, not copies)

Study these for **density, color discipline, and trace overlays** — then design your own look:

- **F1 Live Timing / Broadcast** — sector purple/green, delta columns, compact tables ([Formula 1](https://www.formula1.com)).
- **AWS F1 Insights** (broadcast graphics) — cause-and-effect storytelling next to lap traces.
- **FastF1 / OpenF1 ecosystem** — Python/analysis tooling; patterns: speed vs distance, throttle/brake traces, tyre stint bars ([FastF1 docs](https://docs.fastf1.dev/), [OpenF1](https://openf1.org)).
- **Community write-ups** — interaction patterns for telemetry dashboards (e.g. search “F1 telemetry interface redesign” on Medium / Reddit r/F1Technical).

**Your product angle:** “cool tools like mine” = **one-glance** story (what happened this lap?) + **one-click** actions (copy data, share result). Avoid generic gradient cards; prefer **grids, monospace numbers, thin dividers**, and a single accent color.

---

## 18. One-click copy for the whole FE agent prompt

**How to use:** **Cmd+A / Ctrl+A** in this file → **Copy** → paste into Cursor (FE repo). The **§14** block is the **short** advanced-telemetry add-on; **§1–12** stay the base contract.

---

## 19. Product story — “You vs references on this track”

**Core fantasy:** user picks **track + setup + strategy**, runs the sim, then answers: **how close am I to known reference profiles on *this* circuit?**

- **Not** generic global F1 stats — **same `trackSlug`**, **session kind** (`quali` vs `race`) and **archetype** (`quali_front_loaded`, `race_tyre_saver`) on each reference row.
- **Deltas, not absolutes** — API returns **Δ race total**, **Δ best lap**, **Δ sector sum**, **Δ top speed on longest straight** (vs reference benchmark). Positive = you are slower unless documented otherwise.
- **Setup honesty** — `setupPreset` is a **style** suggestion; do **not** claim it is a real driver unless you have rights. **“Reference: aggressive quali (benchmark)”** is enough.
- **One screen after simulate:** title **“You vs references on [track]”** — bar chart or table of gaps; one line **“Closest match: …”** from **`closestReferenceMatch`**.
- **Copy:** `exportSummary` + full `result` JSON for Discord/debug; **`setupFingerprint`** is a short SHA-256 prefix of the setup JSON.

---

*End of file — select all above to copy in one click.*
