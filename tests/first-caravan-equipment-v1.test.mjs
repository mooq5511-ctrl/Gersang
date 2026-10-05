import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {auditFreshPrologue} from '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {makeFirstCaravanSword}=require('../app/game-equipment-factory.ts');
const {v1Definition,v1PartCore,v1SellPrice,v1EnhancementCost}=require('../app/equipment-v1-policy.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const {createNpcController}=require('../app/game-npc-controller.ts');
const {npcById}=require('../app/npc-dialogue.ts');
const {worldCities}=require('../app/v15-data.ts');

test('new tutorial sword uses the shared level-one budget and survives serialized metadata',()=>{
  const sword=makeFirstCaravanSword('quest-test');
  assert.equal(sword.definitionId,'quest-first-caravan-sword');
  assert.deepEqual(effectiveEquipmentStats(sword),v1PartCore(1,'weapon'));
  const restored=JSON.parse(JSON.stringify(sword));
  assert.deepEqual(v1Definition(restored),v1Definition(sword));
  assert.deepEqual(effectiveEquipmentStats(restored),effectiveEquipmentStats(sword));
  assert.ok(v1SellPrice(sword)>0);
  assert.ok(v1EnhancementCost(sword)>0);
  assert.notEqual(makeFirstCaravanSword().uid,makeFirstCaravanSword().uid);
});

test('formal quest awards versioned sword once; replay never duplicates gold or equipment',()=>{
  let state=auditFreshPrologue({seed:1,seconds:180,captureState:true}).state;
  assert.equal(state.hanyangPrologueStep,'completed');
  assert.equal(state.hero.equip.weapon.definitionId,'quest-first-caravan-sword');
  const gold=state.gold,weapon=structuredClone(state.hero.equip.weapon),inventory=structuredClone(state.inventory);
  const noop=()=>{};
  createNpcController({game:state,currentCity:worldCities.find(city=>city.id===state.city),setGame:update=>{state=update(state);},setNotice:noop,setActiveNpcId:noop,setActiveTab:noop,setCityService:noop,setNpcOpeningLine:noop})
    .handleNpcAction({npc:npcById('kim-seongho'),option:{label:'回報任務',reply:'重複確認',quest:'complete'}});
  assert.equal(state.gold,gold);
  assert.deepEqual(state.hero.equip.weapon,weapon);
  assert.deepEqual(state.inventory,inventory);
});

test('an unversioned saved sword keeps its existing core rather than inferring version by name',()=>{
  const legacy={...makeFirstCaravanSword('legacy'),definitionId:undefined,balanceVersion:undefined,atk:18};
  const before=structuredClone(legacy);
  assert.equal(v1Definition(legacy),null);
  assert.equal(effectiveEquipmentStats(legacy).atk,18);
  assert.deepEqual(legacy,before);
});
