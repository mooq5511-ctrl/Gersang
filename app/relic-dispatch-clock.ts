/** Bound the display clock to this expedition, even before its first timer tick. */
export function relicDispatchRemaining(startedAt: number, endsAt: number, now: number): number {
  if (![startedAt, endsAt, now].every(Number.isFinite)) return 0;
  return Math.max(0, endsAt - Math.max(startedAt, now));
}
