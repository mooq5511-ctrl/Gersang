import test from 'node:test';
import assert from 'node:assert/strict';
import {intervalUnionMs,analyzeBrowserTrace} from '../scripts/analyze-browser-trace.mjs';
const event=(name,ts,dur,extra={})=>({name,ph:'X',pid:1,tid:2,ts,dur,...extra});
test('overlapping and nested trace intervals count once and retain separated time',()=>{
  assert.equal(intervalUnionMs([event('a',0,10000),event('b',1000,2000),event('c',8000,4000),event('d',15000,1000)]),13);
  assert.equal(intervalUnionMs([]),0);
});
test('analysis excludes profiler startup, other threads and incomplete events',()=>{
  const trace={traceEvents:[event('Layout',0,90000),event('EventDispatch',100000,5000,{args:{data:{type:'click'}}}),
    event('Layout',105000,20000,{args:{beginData:{dirtyObjects:25,totalObjects:40}}}),
    event('Layout',110000,900000,{tid:3}),event('Layout',110000,900000,{pid:9}),
    event('Layout',110000,900000,{ph:'B'}),event('InlineNode::ShapeTextIncludingFirstLine',106000,3000),
    event('InlineNode::ShapeTextIncludingFirstLine',107000,1000)]};
  const before=structuredClone(trace),result=analyzeBrowserTrace(trace);
  assert.equal(result.clickMs,5);assert.equal(result.layout.unionMs,20);
  assert.equal(result.largestLayout.textShapeMs,3);assert.equal(result.largestLayout.dirtyObjects,25);
  assert.deepEqual(trace,before);
});
test('empty or unsupported trace cannot be reported as a successful measurement',()=>{
  assert.equal(analyzeBrowserTrace({traceEvents:[]}).valid,false);
  assert.throws(()=>analyzeBrowserTrace({}),TypeError);
});
test('selected interaction excludes earlier clicks and clips work at the next click',()=>{
  const click=ts=>event('EventDispatch',ts,5000,{args:{data:{type:'click'}}});
  const trace={traceEvents:[click(100000),event('Layout',110000,50000),click(200000),
    event('Layout',210000,30000),click(220000),event('Layout',230000,90000)]};
  const before=structuredClone(trace),result=analyzeBrowserTrace(trace,{clickIndex:1});
  assert.equal(result.recordedClicks,3);assert.equal(result.clickIndex,1);assert.equal(result.windowDurationMs,20);
  assert.equal(result.layout.unionMs,10);assert.deepEqual(trace,before);
  assert.equal(analyzeBrowserTrace(trace,{clickIndex:3}).valid,false);
  assert.throws(()=>analyzeBrowserTrace(trace,{clickIndex:-1}),RangeError);
});

test('first-paint window clips work and excludes later layout and other threads',()=>{
  const trace={traceEvents:[event('EventDispatch',100000,5000,{args:{data:{type:'click'}}}),
    event('Paint',101000,500),event('Paint',106000,500,{tid:3}),
    event('Layout',105000,5000),event('FunctionCall',107000,10000),
    event('Paint',111000,1000),event('Layout',120000,90000)]};
  const before=structuredClone(trace),r=analyzeBrowserTrace(trace,{window:'first-paint'});
  assert.equal(r.valid,true);assert.equal(r.windowDurationMs,12);
  assert.equal(r.layout.unionMs,5);assert.equal(r.script.unionMs,5);
  // The window includes the 0.5ms Paint during the click as well as the final 1ms Paint.
  assert.equal(r.paint.unionMs,1.5);assert.match(r.note,/NOT compositor presentation/);
  assert.deepEqual(trace,before);
});

test('missing, incomplete or subsequent-interaction paint is not presentation evidence',()=>{
  const click=ts=>event('EventDispatch',ts,5000,{args:{data:{type:'click'}}});
  for(const bad of [[],[event('Paint',106000,1000,{ph:'B'})],[click(108000),event('Paint',109000,1000)],[event('Paint',106000,0)]]){
    assert.equal(analyzeBrowserTrace({traceEvents:[click(100000),...bad]},{window:'first-paint'}).valid,false);
  }
  assert.throws(()=>analyzeBrowserTrace({traceEvents:[]},{window:'unknown'}),RangeError);
});
