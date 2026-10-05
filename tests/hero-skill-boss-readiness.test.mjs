import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
import {measureEquipmentFixture} from '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {ADVENTURE_QUESTS}=require('../app/adventure-quests.ts');
const {DUNGEONS}=require('../app/dungeon-engine.ts');
function party(level){
  const base=curveFixture(level,'spear','live',level,'普通',0,null,true);
  return {units:[base.units[0],...Array.from({length:3},(_,i)=>({...base.units[1],uid:'merc'+i}))],party:[base.party[0],...Array.from({length:3},(_,i)=>({...base.party[1],uid:'merc'+i}))]};
}
test('existing level-twenty chapter boss is beatable with promoted spears and ordinary gear, without changing boss data',()=>{
  const quest=ADVENTURE_QUESTS.find(quest=>quest.maxLevel===20&&quest.conditions.some(condition=>condition.metric==='banditBoss'));
  assert.ok(quest);assert.equal(quest.conditions.find(condition=>condition.metric==='level').target,20);
  const samples=Array.from({length:30},(_,seed)=>measureEquipmentFixture(party(20),'e_starter_pirate_king',.99,seed+1,1));
  assert.ok(samples.every(row=>row.victories===1&&row.fights[0].seconds<60));
  assert.equal(measureEquipmentFixture(party(12),'e_starter_pirate_king',.99,1,1).victories,0);
  assert.equal(DUNGEONS.e_starter_pirate_king.hp,8000);
  // Combat fixture supplies ranks and gear; natural seal/income acquisition still needs a playthrough.
});
