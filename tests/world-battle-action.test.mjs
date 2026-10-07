import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {runWorldBattleAction}=require('../app/world-battle-action.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {grantXp}=require('../app/game-progression.ts');
const {appendGameLog,enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const deps={addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};
const rolls={roll:.99,choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:0,materialRolls:[1,1,1],gearDropRoll:1,sealDropRoll:1};
const act=(state,action,now=1000,key=state.dungeon.key)=>runWorldBattleAction(state,action,now,key,rolls,deps);
function fixture(step='bandit-trial') {
  const state=freshGame('手動操作測試');
  return {...state,hanyangPrologueStep:step,onboardingStep:'completed',
    hero:{...state.hero,hp:10000,maxHp:10000},
    dungeon:{...freshDungeon(),key:'e_starter_black_bandit'}};
}
function win(state,key) {
  let next=act({...state,hero:{...state.hero,str:10000}},'start',1000,key);
  for(let now=1200;now<=31000&&next.kills===state.kills;now+=200)next=act(next,'tick',now,key);
  assert.ok(next.kills>state.kills,'fixture must win through the real engine');
  return next;
}

test('retreat and stop never restore bandit cargo or skip delivery',()=>{
  const fighting=act(fixture(),'start');
  assert.equal(fighting.dungeon.status,'fighting');
  for(const action of ['retreat','stop']) {
    const result=act(fighting,action,1200);
    assert.equal(result.hanyangPrologueStep,'bandit-trial');
    assert.equal(result.hanyangPrologueFlags.caravanRestored,false);
    assert.equal(result.kills,fighting.kills);
  }
});

test('actual manual bandit victory follows the cargo handoff rather than return',()=>{
  const next=win(fixture(),'e_starter_black_bandit');
  assert.equal(next.hanyangPrologueStep,'caravan-delivery');
  assert.equal(next.hanyangPrologueFlags.caravanRestored,true);
  assert.equal(next.hanyangPrologueFlags.caravanCargoDelivered,false);
});

test('manual delivery victory reaches the same first-sale step as loop guidance',()=>{
  const state={...fixture('outskirts'),starterDeliveryKills:2,
    npcProgress:{...fixture().npcProgress,activeQuests:['npc-first-caravan-delivery']}};
  const next=win(state,'e_starter_raccoon');
  assert.equal(next.starterDeliveryKills,3);
  assert.equal(next.hanyangPrologueStep,'first-sale');
});

test('stopping the legacy trial does not fake a scripted defeat or restore old HP',()=>{
  const state={...fixture(),onboardingStep:'mercenary-trial'};
  const fighting=act(state,'start');
  assert.equal(fighting.dungeon.status,'fighting');
  for(const action of ['retreat','stop']) {
    const result=act(fighting,action,1200);
    assert.equal(result.onboardingStep,'mercenary-trial');
    assert.equal(result.logs.some(log=>log.includes('這不是懲罰')),false);
  }
});

test('ordinary non-story actions preserve engine results exactly',()=>{
  const state=fixture('completed');
  assert.deepEqual(act(state,'start'),runDungeonAction(state,'start',1000,state.dungeon.key,rolls,deps));
});

test('world panel delegates to the module and samples encounter randomness before updater',()=>{
  const source=readFileSync(new URL('../app/game-world-battle-panel.tsx',import.meta.url),'utf8');
  assert.match(source,/setGame\(previous=>runWorldBattleAction/);
  assert.doesNotMatch(source,/hanyangPrologueStep:/);
  assert.ok(source.indexOf('encounterCountRoll:Math.random()')<source.indexOf('setGame(previous=>runWorldBattleAction'));
});

test('turning auto hunt off during combat finishes once and never starts another encounter',()=>{
  const state=fixture('completed');
  let next=act(state,'start-auto-hunt');
  assert.equal(next.dungeon.status,'fighting');
  next=act(next,'toggle-auto-hunt',1200);
  assert.equal(next.dungeon.autoHunt,false);
  assert.equal(next.dungeon.status,'fighting');
  let now=1400;
  for(;now<=31000&&next.kills===state.kills;now+=200)next=act(next,'tick',now);
  assert.ok(next.kills>state.kills);
  assert.equal(next.dungeon.status,'idle');
  const kills=next.kills;
  for(let elapsed=0;elapsed<10000;elapsed+=200)next=act(next,'tick',now+elapsed);
  assert.equal(next.kills,kills);
  assert.equal(next.dungeon.status,'idle');
});

test('turning auto hunt off while respawning cancels the next wave and can restart normally',()=>{
  const state=fixture('completed');
  const waiting=act({...state,hero:{...state.hero,str:10000}},'start-auto-hunt');
  assert.equal(waiting.dungeon.status,'respawning');
  const stopped=act(waiting,'toggle-auto-hunt',1200);
  assert.equal(stopped.dungeon.status,'idle');
  assert.equal(stopped.dungeon.autoHunt,false);
  assert.equal(stopped.kills,waiting.kills);
  const restarted=act(stopped,'start-auto-hunt',1400);
  assert.equal(restarted.dungeon.autoHunt,true);
  assert.ok(restarted.kills>stopped.kills);
});

test('continuous world view retains a real accessible auto-hunt switch disabled during recovery',()=>{
  const source=readFileSync(new URL('../app/dungeon-panel.tsx',import.meta.url),'utf8');
  assert.match(source,/role="switch" aria-checked=\{state.autoHunt===true\} aria-label=\{state.autoHunt\?'停止自動練功':'開始自動練功'\}/);
  assert.match(source,/disabled=\{state.status==='recovering'\} onClick=\{\(\)=>act\(state.autoHunt\?'toggle-auto-hunt':'start-auto-hunt',state.key\)\}/);
  assert.doesNotMatch(source,/continuousHunt \? <span className=\{'battle-auto-training'/);
});
