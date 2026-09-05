import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentSellPrice,sellEquipmentFromInventory} from '../app/equipment-market.ts';

const gear=(uid='gear',overrides={})=>({uid,name:'試煉鋼刀',atk:10,def:5,hp:20,enhance:0,requiredLevel:1,rarity:'普通',magic:[],bonus:{str:0,agi:0,intel:0,vit:0},resist:{physical:0,magic:0},...overrides});

test('equipment sale price is deterministic and grows with quality',()=>{
 const normal=equipmentSellPrice(gear());
 assert.equal(normal,332);
 assert.ok(equipmentSellPrice(gear('rare',{rarity:'稀有'}))>normal);
 assert.ok(equipmentSellPrice(gear('enhanced',{enhance:5,magic:[{value:12}],bonus:{str:8}}))>normal);
});

test('selling removes exactly the selected inventory item and pays its displayed value',()=>{
 const a=gear('a'),b=gear('b',{name:'保留裝備'}),inventory=[a,b];
 const result=sellEquipmentFromInventory(inventory,100,'a');
 assert.equal(result.error,null);assert.deepEqual(result.inventory,[b]);
 assert.equal(result.earned,equipmentSellPrice(a));assert.equal(result.gold,100+result.earned);
 assert.deepEqual(inventory,[a,b]);
});

test('equipped or unknown items cannot be sold through the inventory action',()=>{
 const inventory=[gear('bag')];
 const result=sellEquipmentFromInventory(inventory,500,'equipped-weapon');
 assert.equal(result.gold,500);assert.equal(result.inventory,inventory);assert.equal(result.earned,0);
 assert.match(result.error,/不在背包/);
});
