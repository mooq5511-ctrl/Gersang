// Browser-only observation. Does not read/write game state, storage, timers or random sources.
(() => {
  const supported = PerformanceObserver.supportedEntryTypes || [];
  const entries = {longtask: [], event: [], 'layout-shift': [], 'largest-contentful-paint': []};
  const describeNode = node => {
    if (!node) return 'detached';
    const element = node.nodeType === 3 ? node.parentElement : node;
    const tag = element?.tagName || 'unknown';
    const id = element?.id ? '#' + element.id : '';
    const classes = typeof element?.className === 'string'
      ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 4) : [];
    return `${tag}${id}${classes.length ? '.' + classes.join('.') : ''}${node.nodeType === 3 ? '::text' : ''}`;
  };
  for (const type of Object.keys(entries)) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const sources=type==='layout-shift'?(entry.sources||[]).slice(0,5).map(source=>({
          node:describeNode(source.node),
          previousRect:source.previousRect?{x:source.previousRect.x,y:source.previousRect.y,width:source.previousRect.width,height:source.previousRect.height}:null,
          currentRect:source.currentRect?{x:source.currentRect.x,y:source.currentRect.y,width:source.currentRect.width,height:source.currentRect.height}:null,
        })):undefined;
        entries[type].push({name: entry.name, startTime: entry.startTime, duration: entry.duration,
          value: entry.value, hadRecentInput: entry.hadRecentInput, interactionId: entry.interactionId,sources});
      }
      if (entries[type].length > 2000) entries[type].splice(0, entries[type].length - 2000);
    });
    observer.observe(type === 'event' ? {type, buffered: true, durationThreshold: 16} : {type, buffered: true});
  }
  let previousFrame = performance.now();
  let windowStart = previousFrame;
  let label = 'initial-load';
  let frames = [];
  let frameTotal=0,frameMaximum=0,framesOver50ms=0;
  const frame = now => {
    const duration=now-previousFrame;
    frames.push(duration);frameTotal++;frameMaximum=Math.max(frameMaximum,duration);
    if(duration>50)framesOver50ms++;
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
    startWindow(name) { label = name; windowStart = performance.now(); previousFrame=windowStart;frames = [];frameTotal=0;frameMaximum=0;framesOver50ms=0;return {label, startTime: windowStart}; },
    read() {
      const elapsed = performance.now() - windowStart;
      const tasks = entries.longtask.filter(entry => entry.startTime >= windowStart);
      const events = entries.event.filter(entry => entry.startTime >= windowStart && entry.interactionId);
      const shifts=entries['layout-shift'].filter(entry=>entry.startTime>=windowStart&&!entry.hadRecentInput);
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const lcp = entries['largest-contentful-paint'].at(-1);
      return {label, elapsedMs: Math.round(elapsed), supported,
        frameSamples: frames.length,frameTotal,framesOver50ms,frameP50Ms: percentile(frames, .5), frameP95Ms: percentile(frames, .95), frameMaxMs:frameTotal?frameMaximum:null,
        longTaskCount: tasks.length, longTaskTotalMs: tasks.reduce((sum, entry) => sum + entry.duration, 0), longTaskMaxMs: tasks.length ? Math.max(...tasks.map(entry => entry.duration)) : 0,
        interactionCount: new Set(events.map(entry => entry.interactionId)).size, interactionMaxMs: events.length ? Math.max(...events.map(entry => entry.duration)) : null,
        ttfbMs: navigation ? navigation.responseStart - navigation.requestStart : null,
        fcpMs: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime ?? null,
        lcpMs: lcp?.startTime ?? null,
        observedLayoutShift:shifts.reduce((sum,entry)=>sum+(entry.value||0),0),layoutShiftCount:shifts.length,
        largestLayoutShifts:[...shifts].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,5),
        note: 'Local browser observation, not field INP/CLS or human playtime; frame data reflects this headless environment. Percentiles retain the last 4000 frames; frame maximum and count cover the full current window. Events and layout shifts are window-scoped; navigation paints describe this page load.'};
    },
  };
})();
