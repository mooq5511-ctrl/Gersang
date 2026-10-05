import test from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/measure-equipment-early.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {rollRelicEquipment}=require('../app/game-equipment-factory.ts');
const {craftRelicEquipmentAction,RELIC_CRAFT_COST}=require('../app/game-inventory-actions.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const log=(logs,message)=>[...logs,message];
const ready=()=>{const game=freshGame('鍛造測試');return {...game,hero:{...game.hero,level:20},gold:15000,materials:{遺跡材料:12,遺跡碎片:2,長槍兵符:1}};};
const offer=()=>({...rollRelicEquipment(20,()=>.1,true),uid:'craft-one'});

test('relic forge spends original costs only on authoritative success and records actual reward',()=>{
  const state=ready(),before=JSON.stringify(state);let notice='';
  const item=offer(),next=craftRelicEquipmentAction(state,item,log,message=>{notice=message;});
  assert.deepEqual(RELIC_CRAFT_COST,{gold:15000,materials:12,shards:2});
  assert.equal(next.gold,0);assert.equal(next.materials.遺跡材料,0);assert.equal(next.materials.遺跡碎片,0);
  assert.equal(next.materials.長槍兵符,1);assert.equal(next.inventory[0].uid,item.uid);
  assert.equal(next.inventory[0].requiredLevel,20);assert.match(notice,/鍛造完成/);
  assert.match(JSON.stringify(next.battleLogs),/鍛造完成/);
  assert.equal(JSON.stringify(state),before);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(next)));
  assert.equal(restored.inventory.find(entry=>entry.uid===item.uid).definitionId,item.definitionId);
});

test('stale resources, level and duplicate offer never produce false success or duplicate charges',()=>{
  const item=offer();
  for(const state of [
    {...ready(),gold:14999},
    {...ready(),materials:{遺跡材料:11,遺跡碎片:2}},
    {...ready(),materials:{遺跡材料:12,遺跡碎片:1}},
    {...ready(),hero:{...ready().hero,level:19}},
    {...ready(),inventory:[item]},
  ]){
    let notice='';const before=JSON.stringify(state);
    assert.equal(craftRelicEquipmentAction(state,item,log,message=>{notice=message;}),state);
    assert.equal(JSON.stringify(state),before);assert.ok(notice);assert.doesNotMatch(notice,/鍛造完成/);
  }
  const first=craftRelicEquipmentAction(ready(),item,log,()=>{});let notice='';
  const second=craftRelicEquipmentAction(first,{...item,uid:'craft-two'},log,message=>{notice=message;});
  assert.equal(second,first);assert.equal(second.inventory.length,1);assert.doesNotMatch(notice,/鍛造完成/);
});
