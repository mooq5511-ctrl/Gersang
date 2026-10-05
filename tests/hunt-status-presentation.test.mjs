import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {huntStatusPresentation}=require('../app/hunt-status-presentation.ts');
test('battle text follows real auto state including tutorial stops and defeat',()=>{
  for(const status of ['idle','fighting','respawning','recovering'])for(const autoHunt of [false,true]){
    const state={status,autoHunt},before=structuredClone(state),view=huntStatusPresentation(state);
    assert.deepEqual(state,before);
    assert.equal(view.enabled,autoHunt&&status!=='recovering');
    if(status==='recovering')assert.match(view.detail,/戰敗後已停止/);
    if(!autoHunt&&status==='fighting')assert.match(view.detail,/本場結束後不再/);
    if(!autoHunt&&status!=='fighting')assert.match(view.label,/已停止/);
    if(autoHunt&&['fighting','respawning'].includes(status))assert.match(view.label,/持續狩獵/);
  }
});
test('global window and continuous panel share display policy without issuing actions',()=>{
  const window=readFileSync(new URL('../app/world-battle-window.tsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../app/dungeon-panel.tsx',import.meta.url),'utf8');
  for(const source of [window,panel])assert.match(source,/huntStatusPresentation\(state\)/);
  assert.match(window,/<DialogDescription>\{huntStatus.detail\}<\/DialogDescription>/);
  assert.match(panel,/\{huntStatus.label\}/);
  assert.doesNotMatch(window,/收起視窗後仍會持續打怪/);
});
