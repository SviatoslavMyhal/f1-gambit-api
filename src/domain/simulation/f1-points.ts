/** F1-style points for top 10 (2010+). Fastest lap point omitted for MVP simplicity. */

const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function pointsForPosition(position: number): number {
  if (position < 1 || position > 10) return 0;
  return POINTS_TABLE[position - 1] ?? 0;
}
