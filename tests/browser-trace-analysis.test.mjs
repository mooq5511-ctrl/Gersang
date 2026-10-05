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
