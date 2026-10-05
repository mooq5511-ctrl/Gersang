import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {toggleRelicAutoExplore,settleRelicAutoExplore,normalizeRelicAutoExplore}=require('../app/relic-auto-explore.ts');
const {vitalStats}=require('../app/vitals-engine.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {settleCurrentGame}=require('../app/game-loop.ts');
function fixture(potions=50,level=250) {
  const game=freshGame('離線攻略');
  const unit={...game.hero,uid:'expedition-spear',templateId:'merchant-spear',name:'远征槍兵',role:'近戰',tier:1,promotionStage:level===250?8:1,level,special:false,hp:undefined,maxHp:undefined};
  unit.hp=vitalStats(unit).maxHp;
  return {...game,restingMercs:[unit],medicines:{...game.medicines,healing:potions}};
}
const open=game=>toggleRelicAutoExplore(game,['expedition-spear'],1000,.1234,30_000);
const day=24*60*60*1000;

test('complete automatic route uses existing four bosses, consumes owned supply and stops without replay rewards',()=>{
  const initial=open(fixture()),result=settleRelicAutoExplore(initial,day);
  assert.equal(result.relicDungeon.clearedRuns,4);
  assert.equal(result.relicDungeon.autoExplore.enabled,false);
  assert.match(result.relicDungeon.autoExplore.stopReason,/四層/);
  assert.ok(result.medicines.healing<initial.medicines.healing);
  assert.ok(result.medicines.healing>=0);assert.ok(result.inventory.length>0);
  assert.ok(result.gold>initial.gold);assert.ok(result.logs.some(log=>log.includes('金創藥 ×1')));
  assert.strictEqual(settleRelicAutoExplore(result,day*2),result);
  assert.equal(initial.relicDungeon.clearedRuns,0);assert.equal(initial.medicines.healing,50);
});

test('offline event ordering and loot content agree with split-budget execution and mid-route save reload',()=>{
  const initial=restoreGame(JSON.parse(serializeGameForStorage(open(fixture()))));
  const whole=settleRelicAutoExplore(initial,day);
  let split=initial;
  for(let step=0;split.relicDungeon.autoExplore.enabled&&step<300;step++) {
    split=settleRelicAutoExplore(split,day,1);
    if(step===6)split=restoreGame(JSON.parse(serializeGameForStorage(split)));
  }
  assert.equal(split.relicDungeon.clearedRuns,4);
  assert.equal(split.gold,whole.gold);assert.deepEqual(split.materials,whole.materials);
  assert.equal(split.medicines.healing,whole.medicines.healing);
  const items=game=>game.inventory.map(({uid,...item})=>item);
  assert.deepEqual(items(split),items(whole));
  assert.equal(split.restingMercs[0].hp,whole.restingMercs[0].hp);
  assert.equal(split.relicDungeon.autoExplore.randomState,whole.relicDungeon.autoExplore.randomState);
});

test('no supply stops after earned victory and preserves real injuries instead of silently buying or healing',()=>{
  const initial=open(fixture(0)),result=settleRelicAutoExplore(initial,day);
  assert.equal(result.relicDungeon.clearedRuns,1);
  assert.equal(result.relicDungeon.autoExplore.enabled,false);
  assert.match(result.relicDungeon.autoExplore.stopReason,/金創藥不足/);
  assert.ok(result.restingMercs[0].hp<vitalStats(result.restingMercs[0]).maxHp);
  assert.equal(result.medicines.healing,0);assert.ok(result.gold>initial.gold);
  assert.ok(result.inventory.length>0);
  assert.strictEqual(settleRelicAutoExplore(result,day*2),result);
});

test('weak expedition really defeats and stops without consuming reserve potions to repeatedly revive',()=>{
  const initial=open(fixture(50,1)),result=settleRelicAutoExplore(initial,day);
  assert.equal(result.relicDungeon.status,'defeated');
  assert.equal(result.relicDungeon.autoExplore.enabled,false);
  assert.equal(result.relicDungeon.clearedRuns,0);assert.equal(result.restingMercs[0].hp,0);
  assert.equal(result.medicines.healing,50);assert.match(result.relicDungeon.autoExplore.stopReason,/戰敗/);
});

test('global loop handles the route while another tab is active, and manual stop does not heal or cancel earned loot',()=>{
  const initial=open(fixture());
  const rolls={now:day,roll:.1,choice:1,spawnRoll:1,encounterCountRoll:0,retaliationRoll:1,materialRolls:[1,1,1]};
  const result=settleCurrentGame(initial,rolls);
  assert.equal(result.relicDungeon.clearedRuns,4);assert.equal(result.relicDungeon.autoExplore.enabled,false);
  const active=settleRelicAutoExplore(initial,1000,1);
  assert.equal(active.relicDungeon.status,'dispatching');
  const stopped=toggleRelicAutoExplore(active,[],2000,.1);
  assert.equal(stopped.relicDungeon.autoExplore.enabled,false);
  assert.equal(stopped.relicDungeon.status,'dispatching');
  assert.equal(stopped.restingMercs[0].hp,active.restingMercs[0].hp);
  assert.strictEqual(settleRelicAutoExplore(stopped,day),stopped);
});

test('party conflicts and malformed automation settings stop safely before extra rewards',()=>{
  const initial=open(fixture());
  const missing={...initial,restingMercs:[]};
  const stopped=settleRelicAutoExplore(missing,day);
  assert.equal(stopped.gold,missing.gold);assert.equal(stopped.inventory.length,missing.inventory.length);
  assert.match(stopped.relicDungeon.autoExplore.stopReason,/離隊/);
  const busy={...fixture(),trade:{...fixture().trade,caravan:{escortIds:['expedition-spear']}}};
  const rejected=open(busy);
  assert.notEqual(rejected.relicDungeon?.autoExplore?.enabled,true);
  for(const patch of [{nextActionAt:0},{nextActionAt:Infinity},{durationMs:1},{randomState:-1},{partyUids:['x','x']}])assert.equal(normalizeRelicAutoExplore({...initial.relicDungeon.autoExplore,...patch}).enabled,false);
});

test('supply heals only the chosen resting squad and charges one owned potion, not currency or the main party',()=>{
  const base=fixture(2);
  base.restingMercs[0].hp=vitalStats(base.restingMercs[0]).maxHp-1;
  const initial=open(base),result=settleRelicAutoExplore(initial,1000,1);
  assert.equal(result.relicDungeon.status,'dispatching');
  assert.equal(result.medicines.healing,1);assert.equal(result.gold,initial.gold);
  assert.equal(result.restingMercs[0].hp,vitalStats(result.restingMercs[0]).maxHp);
  assert.deepEqual(result.hero,initial.hero);assert.deepEqual(result.mercs,initial.mercs);
  assert.equal(result.relicDungeon.hp,result.restingMercs[0].hp);
});
