import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/browser-performance-probe.js',import.meta.url),'utf8');
function fixture(){
  let now=0,frame;const observers=new Map();
  class Observer{
    static supportedEntryTypes=['longtask','event','layout-shift','largest-contentful-paint'];
    constructor(callback){this.callback=callback;}
    observe({type}){observers.set(type,this.callback);}
  }
  const context=vm.createContext({window:{},PerformanceObserver:Observer,
    performance:{now:()=>now,getEntriesByType:()=>[]},requestAnimationFrame:callback=>{frame=callback;}});
  vm.runInContext(source,context);
  return {probe:context.window.__gersangPerf,time:value=>{now=value;},frame:value=>{now=value;frame(value);},
    emit:(type,entries)=>observers.get(type)({getEntries:()=>entries})};
}
test('probe isolates current-window shifts and never counts recent-input shifts as instability',()=>{
  const h=fixture();h.emit('layout-shift',[{startTime:10,value:.5,hadRecentInput:false}]);
  h.time(100);h.probe.startWindow('battle');
  h.emit('layout-shift',[{startTime:110,value:.2,hadRecentInput:true},
    {startTime:120,value:.03,hadRecentInput:false,sources:[{node:{tagName:'DIV',className:'party health'},previousRect:{x:0,y:1,width:2,height:3},currentRect:{x:0,y:2,width:2,height:3}}]}]);
  const result=h.probe.read();assert.equal(result.observedLayoutShift,.03);assert.equal(result.layoutShiftCount,1);
  assert.equal(result.largestLayoutShifts[0].sources[0].node,'DIV.party.health');
  h.time(200);h.probe.startWindow('next');assert.equal(h.probe.read().observedLayoutShift,0);
});
test('frame maximum covers the full window even after the bounded percentile sample rolls over',()=>{
  const h=fixture();h.time(100);h.probe.startWindow('full');h.frame(300);
  for(let i=1;i<=4001;i++)h.frame(300+i*10);
  const result=h.probe.read();assert.equal(result.frameSamples,4000);assert.equal(result.frameTotal,4002);
  assert.equal(result.frameMaxMs,200);assert.equal(result.framesOver50ms,1);assert.equal(result.frameP95Ms,10);
  h.time(41000);h.probe.startWindow('reset');h.frame(41010);
  assert.equal(h.probe.read().frameMaxMs,10);assert.equal(h.probe.read().frameTotal,1);
});
test('only current-window tasks and real interactions contribute to their summaries',()=>{
  const h=fixture();h.time(100);h.probe.startWindow('controls');
  h.emit('longtask',[{startTime:80,duration:500},{startTime:110,duration:60}]);
  h.emit('event',[{startTime:90,duration:400,interactionId:1},{startTime:120,duration:20,interactionId:0},
    {startTime:130,duration:32,interactionId:2},{startTime:131,duration:48,interactionId:2}]);
  const result=h.probe.read();assert.equal(result.longTaskCount,1);assert.equal(result.longTaskMaxMs,60);
  assert.equal(result.interactionCount,1);assert.equal(result.interactionMaxMs,48);
});
test('shift sources identify text-node parents without collecting displayed text',()=>{
  const h=fixture();h.probe.startWindow('text-source');
  h.emit('layout-shift',[{startTime:1,value:.01,hadRecentInput:false,sources:[
    {node:{nodeType:3,textContent:'private text',parentElement:{tagName:'SPAN',id:'status',className:'dungeon-status'}}},
    {node:{nodeType:3,parentElement:null}},
    {node:{tagName:'DIV',className:'   '}},
    {node:null},
  ]}]);
  const result=h.probe.read();
  assert.deepEqual(Array.from(result.largestLayoutShifts[0].sources,source=>source.node),
    ['SPAN#status.dungeon-status::text','unknown::text','DIV','detached']);
  assert.equal(JSON.stringify(result).includes('private text'),false);
});
