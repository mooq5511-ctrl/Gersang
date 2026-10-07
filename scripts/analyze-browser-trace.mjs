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

export function analyzeBrowserTrace(trace,{clickIndex=0}={}){
  if(!Array.isArray(trace?.traceEvents))throw new TypeError('Missing traceEvents array');
  if(!Number.isInteger(clickIndex)||clickIndex<0)throw new RangeError('clickIndex must be a nonnegative integer');
  const events=trace.traceEvents;
  const clicks=events.filter(e=>e.ph==='X'&&e.name==='EventDispatch'&&e.args?.data?.type==='click').sort((a,b)=>a.ts-b.ts);
  const click=clicks[clickIndex];
  if(!click)return {valid:false,reason:'Requested click was not recorded: cannot attribute this trace to that interaction.'};
  const end=clicks.slice(clickIndex+1).find(e=>e.pid===click.pid&&e.tid===click.tid)?.ts??Infinity;
  const after=events.filter(e=>e.ph==='X'&&e.pid===click.pid&&e.tid===click.tid&&e.ts>=click.ts&&e.ts<end&&Number.isFinite(e.dur)&&e.dur>=0)
    .map(e=>({...e,dur:Math.min(e.dur,end-e.ts)}));
  const summary=name=>{const found=after.filter(e=>e.name===name);return {count:found.length,unionMs:intervalUnionMs(found),maxMs:found.length?Math.max(...found.map(e=>e.dur))/1000:0};};
  const layout=after.filter(e=>e.name==='Layout').sort((a,b)=>b.dur-a.dur)[0];
  const shape=layout?after.filter(e=>e.name==='InlineNode::ShapeTextIncludingFirstLine'&&e.ts>=layout.ts&&e.ts+e.dur<=layout.ts+layout.dur):[];
  return {valid:true,eventCount:events.length,clickIndex,recordedClicks:clicks.length,windowDurationMs:Number.isFinite(end)?(end-click.ts)/1000:null,clickMs:click.dur/1000,
    layout:summary('Layout'),style:summary('UpdateLayoutTree'),script:summary('FunctionCall'),paint:summary('Paint'),
    largestLayout:layout?{ms:layout.dur/1000,dirtyObjects:layout.args?.beginData?.dirtyObjects??null,
      totalObjects:layout.args?.beginData?.totalObjects??null,textShapeMs:intervalUnionMs(shape),textShapeEvents:shape.length}:null,
    note:'Only complete events on the clicked renderer thread from the selected click to the next click on that thread (or trace end). Categories overlap; do not sum them. Profiler startup before the selected click is excluded, but recording overhead remains. Not INP, FPS, or proof of gameplay pacing.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2])throw new Error('Usage: node scripts/analyze-browser-trace.mjs trace.json');
  console.log(JSON.stringify(analyzeBrowserTrace(JSON.parse(await readFile(process.argv[2],'utf8')),{clickIndex:process.argv[3]===undefined?0:Number(process.argv[3])}),null,2));
}
