import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {settleCaravanIdle} from '../app/caravan-idle.ts';
import {EQUIPMENT_SLOTS,emptyEquipmentSlots,equipFromInventory,unequipToInventory,migrateSevenSlotSave} from '../app/equipment-slots.ts';
test('idle pays whole seconds once and retains remainder',()=>{
  const a=settleCaravanIdle(1000,2500);assert.deepEqual(a,{stamp:2000,gold:5,credit:2});
  assert.equal(settleCaravanIdle(a.stamp,2500).gold,0);
  assert.equal(settleCaravanIdle(a.stamp,3000).gold,5);
});
test('offline caps at eight hours and never repays discarded time',()=>{
  const a=settleCaravanIdle(1000,100000000);assert.equal(a.gold,28800*5);assert.equal(a.credit,28800*2);
  assert.equal(settleCaravanIdle(a.stamp,100000000).gold,0);
});
test('backward clock and invalid old timestamp give no reward',()=>{
  assert.deepEqual(settleCaravanIdle(5000,1000),{stamp:5000,gold:0,credit:0});
  assert.equal(settleCaravanIdle(NaN,1000).gold,0);
});
test('eight slots include a weapon and two distinct rings',()=>{
  assert.equal(EQUIPMENT_SLOTS.length,8);
  let unit={level:1,equip:emptyEquipmentSlots()};
  let inv=[{uid:'a',slot:'ring'},{uid:'b',slot:'ring'},{uid:'sword',slot:'weapon'}];
  let a=equipFromInventory(unit,inv,'a','ring1');let b=equipFromInventory(a.unit,a.inventory,'b','ring2');
  assert.equal(b.unit.equip.ring1.uid,'a');assert.equal(b.unit.equip.ring2.uid,'b');
  assert.ok(equipFromInventory(b.unit,b.inventory,'a','ring2').error);
  let c=equipFromInventory(b.unit,b.inventory,'sword','weapon');assert.equal(c.unit.equip.weapon.uid,'sword');
  assert.equal(unequipToInventory(c.unit,c.inventory,'weapon').inventory.length,1);
});
test('migration retains weapon, maps accessory and is idempotent',()=>{
  const old={hero:{equip:{weapon:{uid:'w',slot:'weapon'},accessory:{uid:'a',slot:'accessory'}}},mercs:[],inventory:[],logs:[]};
  const next=migrateSevenSlotSave(old);assert.equal(next.hero.equip.weapon.uid,'w');assert.equal(next.hero.equip.amulet.uid,'a');
  assert.deepEqual(migrateSevenSlotSave(next),next);
});
test('integration enforces nine, grants five hero points and trains all hired units',()=>{
  const text=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
  assert.match(text,/previous.mercs.length >= 9/);assert.match(text,/unit.uid === "hero" \? 5 : 3/);
  assert.match(text,/mercs:previous.mercs.map\(unit=>grantXp\(unit,100\)\)/);
  assert.match(text,/settleCaravanIdle\(previous.idleStamp, now\)/);
});
