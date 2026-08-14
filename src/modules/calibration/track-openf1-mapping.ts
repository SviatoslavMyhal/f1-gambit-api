/**
 * Maps our `Track.slug` to a specific F1 meeting in OpenF1.
 * We resolve by `year` + exact `meetingName` (see GET /v1/meetings?year=…).
 *
 * Session used for lap aggregates: `sessionName` (typically Race = realistic race stints).
 * Update `year` periodically to keep baselines aligned with recent regs / cars.
 */
export type TrackOpenF1Source = {
  trackSlug: string;
  year: number;
  /** Must match OpenF1 `meeting_name` exactly for the year. */
  meetingName: string;
  /** OpenF1 `session_name` (e.g. Race, Qualifying). */
  sessionName: string;
};

export const TRACK_OPENF1_SOURCES: readonly TrackOpenF1Source[] = [
  {
    trackSlug: 'monaco',
    year: 2024,
    meetingName: 'Monaco Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'monza',
    year: 2024,
    meetingName: 'Italian Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'silverstone',
    year: 2024,
    meetingName: 'British Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'spa',
    year: 2024,
    meetingName: 'Belgian Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'suzuka',
    year: 2024,
    meetingName: 'Japanese Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'interlagos',
    year: 2024,
    meetingName: 'São Paulo Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'bahrain',
    year: 2024,
    meetingName: 'Bahrain Grand Prix',
    sessionName: 'Race',
  },
  {
    trackSlug: 'singapore',
    year: 2024,
    meetingName: 'Singapore Grand Prix',
    sessionName: 'Race',
  },
] as const;

export function openF1SourceForTrackSlug(
  slug: string,
): TrackOpenF1Source | undefined {
  return TRACK_OPENF1_SOURCES.find((s) => s.trackSlug === slug);
}
