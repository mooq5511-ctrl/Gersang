// Browser-only diagnostic; run through agent-browser eval --stdin, never shipped.
(async () => {
  if (document.hidden || document.querySelector('[role="dialog"]')) throw new Error('Close dialogs and keep this test tab visible before measuring.');
  const frames = [], longTasks = [], events = [];
  let previous, mutations = 0;
  const start = performance.now();
  const dom = new MutationObserver(records => { mutations += records.length; });
  dom.observe(document.querySelector('.classic-live-game'), { subtree: true, childList: true, characterData: true, attributes: true });
  const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
  observer.observe({ type: 'longtask', buffered: false });
  const frame = time => { if (previous !== undefined) frames.push(time - previous); previous = time; };
  while (performance.now() - start < 8000) await new Promise(resolve => requestAnimationFrame(time => { frame(time); resolve(); }));
  dom.disconnect(); observer.disconnect();
  if (document.querySelector('[role="dialog"]')) throw new Error('A dialog opened during sampling; discard this run and retry.');
  for (let i = 0; i < 10; i++) {
    const button = document.querySelector('.objective-collapse-toggle, [aria-label="收合任務面板"]');
    const now = performance.now();
    button.click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    events.push(performance.now() - now);
  }
  const quantile = (items, p) => [...items].sort((a, b) => a - b)[Math.min(items.length - 1, Math.floor(items.length * p))] ?? 0;
  return JSON.stringify({ durationMs: Math.round(performance.now() - start), viewport: [innerWidth, innerHeight], frames: frames.length, frameP50: +quantile(frames, .5).toFixed(1), frameP95: +quantile(frames, .95).toFixed(1), framesOver50ms: frames.filter(x => x > 50).length, longTasks: longTasks.length, longestTaskMs: +Math.max(0, ...longTasks).toFixed(1), mutations, questToggleP50: +quantile(events, .5).toFixed(1), questToggleP95: +quantile(events, .95).toFixed(1) });
})()
