import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PRICES,VILLAGE_WEAPONS,buyVillageWeapon,exchangeAttackBonus,sellAllMaterials,sellMaterial,weaponCost} from '../app/village-exchange.ts';
import {combatStats} from '../app/vitals-engine.ts';

test('all world materials have a positive village buy price',()=>{
 assert.ok(Object.keys(MATERIAL_PRICES).length>=24);
 assert.ok(Object.values(MATERIAL_PRICES).every(price=>price>0));
 assert.equal(MATERIAL_PRICES['舊斧頭'],150);
 assert.equal(MATERIAL_PRICES['高級旗槍'],8000);
});

test('selling one material pays its price and removes empty stacks',()=>{
 const result=sellMaterial({肉類:2},100,'肉類');
 assert.deepEqual(result.materials,{肉類:1});assert.equal(result.gold,120);assert.equal(result.earned,20);
 const last=sellMaterial(result.materials,result.gold,'肉類');
 assert.deepEqual(last.materials,{});assert.equal(last.gold,140);
});

test('sell all preserves unknown legacy materials instead of deleting them',()=>{
 const result=sellAllMaterials({舊斧頭:2,肉類:3,絕版紀念物:4},10);
 assert.deepEqual(result.materials,{絕版紀念物:4});assert.equal(result.earned,360);assert.equal(result.gold,370);
});

test('weapon purchases stack attack and inflate the next price by thirty percent',()=>{
 const first=buyVillageWeapon(10000,{},'refined-steel-sword');
 assert.equal(first.error,null);assert.equal(first.gold,9500);assert.equal(exchangeAttackBonus(first.purchases),8);
 assert.equal(weaponCost('refined-steel-sword',first.purchases),650);
 const second=buyVillageWeapon(first.gold,first.purchases,'refined-steel-sword');
 assert.equal(exchangeAttackBonus(second.purchases),16);assert.equal(weaponCost('refined-steel-sword',second.purchases),845);
});

test('permanent exchange bonus participates in actual combat attack',()=>{
 const base={templateId:'hero',level:1,str:20,agi:15,vit:20,intel:10,equip:{}};
 assert.equal(combatStats({...base,flatAttackBonus:333}).attack-combatStats(base).attack,333);
 assert.deepEqual(VILLAGE_WEAPONS.map(g=>g.atkBonus),[8,25,80,300]);
});
