import { TireCompound } from '../setup/dto/tire-compound';
import type { SessionTelemetry } from '../telemetry/telemetry.types';
import { buildSimulatedLeadChangeEvents } from './multiplayer-timeline.util';

function lt(
  lap: number,
  timeSeconds: number,
): SessionTelemetry['lapTimes'][0] {
  return {
    lap,
    timeSeconds,
    delta: 0,
    isPersonalBest: true,
    compound: TireCompound.SOFT,
    tireAge: lap,
    fuelCorrected: 0,
  };
}

function minimalSession(
  id: string,
  laps: SessionTelemetry['lapTimes'],
): SessionTelemetry {
  return {
    sessionId: id,
    trackSlug: 'test',
    totalLaps: laps.length,
    lapTimes: laps,
    tireData: [],
    speedTrace: [],
    sectorSplits: [],
    events: [],
    strategy: [],
    advancedLaps: [],
    telemetryStream: [],
  };
}

describe('buildSimulatedLeadChangeEvents', () => {
  it('emits when cumulative leader switches', () => {
    const host = minimalSession('h', [
      lt(1, 100),
      lt(2, 80),
    ]);
    const opp = minimalSession('o', [
      lt(1, 95),
      lt(2, 90),
    ]);
    const events = buildSimulatedLeadChangeEvents(host, opp);
    const leadChanges = events.filter((e) => e.type === 'LEAD_CHANGE');
    expect(leadChanges.length).toBeGreaterThanOrEqual(1);
    expect(leadChanges.some((e) => e.lap === 2 && e.side === 'host')).toBe(
      true,
    );
    expect(leadChanges[0]!.detail).toContain('[simulation]');
  });
});
