import type { MultiplayerTimelineEvent } from '../../simulation/multiplayer-timeline.util';

export type LobbySummaryOpts = {
  inviteCode?: string;
  trackName?: string;
  trackSlug?: string;
};

function pickResult(json: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const branch = json[key];
  if (!branch || typeof branch !== 'object') return null;
  const r = (branch as Record<string, unknown>).result;
  return r && typeof r === 'object' ? (r as Record<string, unknown>) : null;
}

function lapsTable(result: Record<string, unknown> | null): string[] {
  if (!result) return ['(no lap data)'];
  const laps = result.laps;
  if (!Array.isArray(laps) || laps.length === 0) return ['(no laps array)'];
  const lines: string[] = [];
  lines.push('Lap | Total s | S1 | S2 | S3');
  for (const row of laps) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const lap = r.lap;
    const t = r.timeSeconds;
    const s = r.sectors;
    const s3 =
      Array.isArray(s) && s.length === 3
        ? `${Number(s[0]).toFixed(3)} / ${Number(s[1]).toFixed(3)} / ${Number(s[2]).toFixed(3)}`
        : '—';
    lines.push(
      `${String(lap).padStart(3)} | ${typeof t === 'number' ? t.toFixed(3) : '—'} | ${s3}`,
    );
  }
  return lines;
}

function eventsTable(events: unknown): string[] {
  if (!Array.isArray(events) || events.length === 0) {
    return ['(no events)'];
  }
  const lines: string[] = [];
  lines.push('Lap | Type | Side | Detail');
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    const o = e as MultiplayerTimelineEvent;
    lines.push(
      `${String(o.lap).padStart(3)} | ${o.type} | ${o.side ?? '—'} | ${o.detail ?? '—'}`,
    );
  }
  return lines;
}

/** Human-readable export for clipboard (multiplayer `simulationResult` JSON shape). */
export function formatLobbySimulationSummaryPlainText(
  json: Record<string, unknown>,
  opts: LobbySummaryOpts,
): string {
  const parts: string[] = [];
  parts.push("F1 Constructor's Gambit — lobby race summary");
  parts.push('');
  if (opts.inviteCode) parts.push(`Invite code: ${opts.inviteCode}`);
  if (opts.trackName) parts.push(`Track: ${opts.trackName}`);
  if (opts.trackSlug) parts.push(`Track slug: ${opts.trackSlug}`);
  parts.push(`Weather: ${String(json.weather ?? '—')}`);
  parts.push(`Seed: ${String(json.seed ?? '—')}`);
  parts.push(`Winner user id: ${String(json.winner ?? 'draw / —')}`);
  parts.push(`Gap (s): ${String(json.gapSeconds ?? '—')}`);
  parts.push(`Simulated at: ${String(json.simulatedAt ?? '—')}`);
  parts.push('');
  parts.push('--- Host ---');
  parts.push(...lapsTable(pickResult(json, 'host')));
  parts.push('');
  parts.push('--- Opponent ---');
  parts.push(...lapsTable(pickResult(json, 'opponent')));
  parts.push('');
  parts.push('--- Timeline (merged) ---');
  parts.push(...eventsTable(json.events));
  parts.push('');
  parts.push('Notes: sector heatmaps and full JSON available via API (`json` field of summary-export).');
  return parts.join('\n');
}
