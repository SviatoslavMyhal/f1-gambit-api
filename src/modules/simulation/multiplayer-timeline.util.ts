import type {
  RaceEventTelemetry,
  SessionTelemetry,
} from '../telemetry/telemetry.types';

/** Public timeline for `simulationResult.events` (lobby / GET results). */
export type MultiplayerTimelineEvent = {
  lap: number;
  type: string;
  side?: 'host' | 'opponent';
  detail?: string;
};

function cumulativeRaceTimeByLap(
  telemetry: SessionTelemetry,
): Map<number, number> {
  let cum = 0;
  const m = new Map<number, number>();
  const laps = [...telemetry.lapTimes].sort((a, b) => a.lap - b.lap);
  for (const lt of laps) {
    cum += lt.timeSeconds;
    m.set(lt.lap, cum);
  }
  return m;
}

/** Maps per-car telemetry events into a unified list with `side`. */
export function mergeTelemetryEventsToTimeline(
  hostEvents: RaceEventTelemetry[],
  opponentEvents: RaceEventTelemetry[],
): MultiplayerTimelineEvent[] {
  const out: MultiplayerTimelineEvent[] = [];
  for (const e of hostEvents) {
    out.push({
      lap: e.lap,
      type: e.type,
      side: 'host',
      detail: e.description,
    });
  }
  for (const e of opponentEvents) {
    out.push({
      lap: e.lap,
      type: e.type,
      side: 'opponent',
      detail: e.description,
    });
  }
  return out;
}

/**
 * Synthetic `LEAD_CHANGE` events from cumulative race time (simulation ground truth).
 * Transparently labeled as simulated in `detail`.
 */
export function buildSimulatedLeadChangeEvents(
  hostTel: SessionTelemetry,
  opponentTel: SessionTelemetry,
): MultiplayerTimelineEvent[] {
  const hostCum = cumulativeRaceTimeByLap(hostTel);
  const oppCum = cumulativeRaceTimeByLap(opponentTel);
  const laps = [...new Set([...hostCum.keys(), ...oppCum.keys()])].sort(
    (a, b) => a - b,
  );

  let prevLeader: 'host' | 'opponent' | null = null;
  const events: MultiplayerTimelineEvent[] = [];

  for (const L of laps) {
    const h = hostCum.get(L);
    const o = oppCum.get(L);
    if (h === undefined || o === undefined) continue;

    let leader: 'host' | 'opponent';
    if (h < o) leader = 'host';
    else if (o < h) leader = 'opponent';
    else leader = prevLeader ?? 'host';

    if (prevLeader !== null && leader !== prevLeader) {
      const gap = Math.abs(h - o);
      events.push({
        lap: L,
        type: 'LEAD_CHANGE',
        side: leader,
        detail: `[simulation] Race lead change — gap ${gap.toFixed(3)}s after lap ${L}`,
      });
    }
    prevLeader = leader;
  }

  return events;
}

function timelineSortKey(e: MultiplayerTimelineEvent): [number, string, string] {
  const side = e.side ?? '';
  return [e.lap, e.type, side];
}

export function buildCombinedMultiplayerTimeline(
  hostTel: SessionTelemetry,
  opponentTel: SessionTelemetry,
): MultiplayerTimelineEvent[] {
  const merged = mergeTelemetryEventsToTimeline(
    hostTel.events,
    opponentTel.events,
  );
  const lead = buildSimulatedLeadChangeEvents(hostTel, opponentTel);
  const all = [...merged, ...lead];
  all.sort((a, b) => {
    const ka = timelineSortKey(a);
    const kb = timelineSortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1].localeCompare(kb[1]);
    return ka[2].localeCompare(kb[2]);
  });
  return all;
}
