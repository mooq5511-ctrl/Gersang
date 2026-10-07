import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/audit-fresh-prologue.mjs';
const {revealBattleObjective}=createRequire(import.meta.url)('../app/battle-objective-focus.ts');

test('objective reveal retries only until the active panel mounts, then focuses without clicking',()=>{
  const originalDocument=globalThis.document, originalFrame=globalThis.requestAnimationFrame;
  const queue=[],calls=[];
  let mounted=false;
  const target={focus:options=>calls.push(['focus',options]),scrollIntoView:options=>calls.push(['scroll',options])};
  try {
    globalThis.requestAnimationFrame=callback=>queue.push(callback);
    globalThis.document={querySelector:selector=>{
      assert.match(selector,/:not\(\[hidden\]\)/);
      assert.match(selector,/:not\(\[data-hidden\]\)/);
      assert.doesNotMatch(selector,/data-state/);
      return mounted?{querySelector:()=>target}:null;
    }};
    revealBattleObjective();
    queue.shift()();assert.equal(calls.length,0);
    mounted=true;queue.shift()();
    assert.deepEqual(calls,[['focus',{preventScroll:true}],['scroll',{block:'center',behavior:'instant'}]]);
    assert.equal(queue.length,0);
  } finally {globalThis.document=originalDocument;globalThis.requestAnimationFrame=originalFrame;}
});

test('missing panel stops after ten frames rather than leaving a permanent polling loop',()=>{
  const originalDocument=globalThis.document,originalFrame=globalThis.requestAnimationFrame;
  const queue=[];let reads=0;
  try {
    globalThis.document={querySelector:()=>{reads++;return null;}};
    globalThis.requestAnimationFrame=callback=>queue.push(callback);
    revealBattleObjective();
    while(queue.length)queue.shift()();
    assert.equal(reads,10);
  } finally {globalThis.document=originalDocument;globalThis.requestAnimationFrame=originalFrame;}
});
