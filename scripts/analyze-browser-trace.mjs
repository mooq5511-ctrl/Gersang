// Read-only Chrome trace analysis. Nested event durations are never added as independent costs.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function intervalUnionMs(events){
  const intervals=events.filter(e=>Number.isFinite(e.ts)&&Number.isFinite(e.dur)&&e.dur>0)
    .map(e=>[e.ts,e.ts+e.dur]).sort((a,b)=>a[0]-b[0]);
  let total=0,start=null,end=null;
  for(const [left,right] of intervals){
    if(start===null){start=left;end=right;}
    else if(left<=end)end=Math.max(end,right);
    else {total+=end-start;start=left;end=right;}
  }
  if(start!==null)total+=end-start;
  return total/1000;
}

export function analyzeBrowserTrace(trace){
  if(!Array.isArray(trace?.traceEvents))throw new TypeError('Missing traceEvents array');
  const events=trace.traceEvents;
  const click=events.filter(e=>e.ph==='X'&&e.name==='EventDispatch'&&e.args?.data?.type==='click')
    .sort((a,b)=>a.ts-b.ts)[0];
  if(!click)return {valid:false,reason:'No recorded click: cannot attribute this trace to a UI interaction.'};
  const after=events.filter(e=>e.ph==='X'&&e.pid===click.pid&&e.tid===click.tid&&e.ts>=click.ts&&Number.isFinite(e.dur)&&e.dur>=0);
  const summary=name=>{const found=after.filter(e=>e.name===name);return {count:found.length,unionMs:intervalUnionMs(found),maxMs:found.length?Math.max(...found.map(e=>e.dur))/1000:0};};
  const layout=after.filter(e=>e.name==='Layout').sort((a,b)=>b.dur-a.dur)[0];
  const shape=layout?after.filter(e=>e.name==='InlineNode::ShapeTextIncludingFirstLine'&&e.ts>=layout.ts&&e.ts+e.dur<=layout.ts+layout.dur):[];
  return {valid:true,eventCount:events.length,clickMs:click.dur/1000,
    layout:summary('Layout'),style:summary('UpdateLayoutTree'),script:summary('FunctionCall'),paint:summary('Paint'),
    largestLayout:layout?{ms:layout.dur/1000,dirtyObjects:layout.args?.beginData?.dirtyObjects??null,
      totalObjects:layout.args?.beginData?.totalObjects??null,textShapeMs:intervalUnionMs(shape),textShapeEvents:shape.length}:null,
    note:'Only complete events on the clicked renderer thread from the first click onward. Categories overlap; do not sum them. Profiler startup before click is excluded, but recording overhead remains. Not INP, FPS, or proof of gameplay pacing.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2])throw new Error('Usage: node scripts/analyze-browser-trace.mjs trace.json');
  console.log(JSON.stringify(analyzeBrowserTrace(JSON.parse(await readFile(process.argv[2],'utf8'))),null,2));
}
