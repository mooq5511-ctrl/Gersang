/** Throttle periodic saves without losing the latest update on exit or slot change. */
export function createGameSaveScheduler<T>(write: (value: T) => void, intervalMs = 2000) {
  let pending: T;
  let dirty = false;
  let lastWrite = -Infinity;
  return {
    update(value: T) { pending = value; dirty = true; },
    flush(now: number, force = false) {
      if (!dirty || (!force && now - lastWrite < intervalMs)) return false;
      write(pending);
      dirty = false;
      lastWrite = now;
      return true;
    },
  };
}
