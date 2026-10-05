import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {makeFirstCaravanSword}=require('../app/game-equipment-factory.ts');
const {heroPersonalPower}=require('../app/hero-rules.ts');
const {unitPower}=require('../app/game-progression.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {equipInventoryItemAction,unequipInventoryItemAction}=require('../app/game-inventory-actions.ts');
const log=(logs,message)=>[message,...logs];

test('first tutorial weapon increases real attack and power without switching the scoring scale',()=>{
  const base=freshGame('continuity');
  const state={...base,hero:{...base.hero,level:2,maxHp:120,hp:120},inventory:[makeFirstCaravanSword('reward')]};
  const snapshot=structuredClone(state);
  const next=equipInventoryItemAction(state,'reward','weapon','hero',log);
  assert.equal(combatStats(state.hero).attack,29);
  assert.equal(combatStats(next.hero).attack,33);
  assert.equal(unitPower(state.hero),128);
  assert.equal(unitPower(next.hero),137);
  assert.equal(combatStats(next.hero).defense,combatStats(state.hero).defense);
  assert.equal(vitalStats(next.hero).maxHp,vitalStats(state.hero).maxHp);
  assert.deepEqual(state,snapshot);
  const off=unequipInventoryItemAction(next,'weapon','hero',log);
  assert.equal(unitPower(off.hero),128);
  assert.equal(off.inventory[0].uid,'reward');
});

test('empty, legacy, versioned and serialized heroes always score the same resolved combat inputs',()=>{
  for(const level of [1,2,11,12,35,36,55,56,71,72,111,112,161,162,211,212,250]){
    const hero={...freshGame().hero,level,maxHp:100+(level-1)*20};
    const modern=makeFirstCaravanSword('test');
    const legacy={...modern,definitionId:undefined,balanceVersion:undefined,atk:18};
    for(const weapon of [null,modern,legacy]){
      const unit={...hero,equip:{...hero.equip,weapon}},before=structuredClone(unit);
      const stats=combatStats(unit),vitals=vitalStats(unit);
      const expected=Math.floor(stats.attack*2.2+stats.defense*1.6+vitals.maxHp*.22);
      assert.equal(unitPower(unit),expected);
      assert.equal(heroPersonalPower(unit),expected);
      assert.equal(unitPower(JSON.parse(JSON.stringify(unit))),expected);
      assert.deepEqual(unit,before);
      if(weapon)assert.ok(unitPower(unit)>unitPower(hero));
    }
  }
});
