// Browser-only observation. Does not read/write game state, storage, timers or random sources.
(() => {
  const supported = PerformanceObserver.supportedEntryTypes || [];
  const entries = {longtask: [], event: [], 'layout-shift': [], 'largest-contentful-paint': []};
  for (const type of Object.keys(entries)) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        entries[type].push({name: entry.name, startTime: entry.startTime, duration: entry.duration,
          value: entry.value, hadRecentInput: entry.hadRecentInput, interactionId: entry.interactionId});
      }
      if (entries[type].length > 2000) entries[type].splice(0, entries[type].length - 2000);
    });
    observer.observe(type === 'event' ? {type, buffered: true, durationThreshold: 16} : {type, buffered: true});
  }
  let previousFrame = performance.now();
  let windowStart = previousFrame;
  let label = 'initial-load';
  let frames = [];
  const frame = now => {
    frames.push(now - previousFrame);
    if (frames.length > 4000) frames.shift();
    previousFrame = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const percentile = (values, fraction) => {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))];
  };
  window.__gersangPerf = {
    startWindow(name) { label = name; windowStart = performance.now(); frames = []; return {label, startTime: windowStart}; },
    read() {
      const elapsed = performance.now() - windowStart;
      const tasks = entries.longtask.filter(entry => entry.startTime >= windowStart);
      const events = entries.event.filter(entry => entry.startTime >= windowStart && entry.interactionId);
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const lcp = entries['largest-contentful-paint'].at(-1);
      return {label, elapsedMs: Math.round(elapsed), supported,
        frameSamples: frames.length, frameP50Ms: percentile(frames, .5), frameP95Ms: percentile(frames, .95), frameMaxMs: frames.length ? Math.max(...frames) : null,
        longTaskCount: tasks.length, longTaskTotalMs: tasks.reduce((sum, entry) => sum + entry.duration, 0), longTaskMaxMs: tasks.length ? Math.max(...tasks.map(entry => entry.duration)) : 0,
        interactionCount: new Set(events.map(entry => entry.interactionId)).size, interactionMaxMs: events.length ? Math.max(...events.map(entry => entry.duration)) : null,
        ttfbMs: navigation ? navigation.responseStart - navigation.requestStart : null,
        fcpMs: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime ?? null,
        lcpMs: lcp?.startTime ?? null,
        observedLayoutShift: entries['layout-shift'].filter(entry => !entry.hadRecentInput).reduce((sum, entry) => sum + (entry.value || 0), 0),
        note: 'Local browser observation, not field INP/CLS or human playtime; frame data reflects this headless environment. Measurements are bounded, and navigation paints describe this page load.'};
    },
  };
})();
