import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {positionInventory,inventoryGrid,addInventoryItem} from '../app/inventory-layout.ts';
import {emptyEquipmentSlots,equipFromInventory,unequipToInventory} from '../app/equipment-slots.ts';
import {rollInventoryLoot} from '../app/inventory-loot.ts';
import {DIVINE_EQUIPMENT} from '../app/divine-equipment.ts';
import {heroPersonalPower,HERO_INITIAL_ATTRIBUTES} from '../app/hero-rules.ts';
const item=(id,bagSlot,slot='weapon')=>({uid:id,bagSlot,slot});
const hero=()=>({...HERO_INITIAL_ATTRIBUTES,level:1,equip:emptyEquipmentSlots()});
test('twenty cells preserve holes and next drop fills first empty cell',()=>{
  let inventory=positionInventory([item('a'),item('b'),item('c')]);
  inventory=inventory.filter(x=>x.uid!=='b');
  const grid=inventoryGrid(inventory);assert.equal(grid.slots.length,20);assert.equal(grid.slots[1],null);assert.equal(grid.slots[2].uid,'c');
  const next=addInventoryItem(inventory,item('drop'));assert.equal(next.inventory.find(x=>x.uid==='drop').bagSlot,1);
});
test('old overflow is never deleted and migrates idempotently across JSON save',()=>{
  const items=Array.from({length:25},(_,i)=>item(String(i)));
  const migrated=positionInventory(items);assert.equal(migrated.length,25);assert.equal(inventoryGrid(migrated).overflow.length,5);
  assert.deepEqual(positionInventory(JSON.parse(JSON.stringify(migrated))),migrated);
  assert.equal(addInventoryItem(migrated,item('new')).error,'背包已滿');
});
test('invalid or duplicate positions are repaired without losing any unique item',()=>{
  const fixed=positionInventory([item('a',0),item('b',0),item('c',999),item('d',-1)]);
  assert.deepEqual(fixed.map(x=>x.bagSlot),[0,1,2,3]);
});
test('full bag still exchanges and returns old gear to clicked cell',()=>{
  const inventory=positionInventory(Array.from({length:20},(_,i)=>item('bag-'+i)));
  const unit=hero();unit.equip.weapon=item('old',19);
  const result=equipFromInventory(unit,inventory,'bag-7');
  assert.equal(result.error,undefined);assert.equal(result.inventory.length,20);
  assert.equal(result.unit.equip.weapon.uid,'bag-7');assert.equal(inventoryGrid(result.inventory).slots[7].uid,'old');
});
test('full bag refuses unequip and incoming loot without changing source data',()=>{
  const inventory=positionInventory(Array.from({length:20},(_,i)=>item('bag-'+i)));
  const unit=hero();unit.equip.weapon=item('worn');
  const off=unequipToInventory(unit,inventory,'weapon');assert.ok(off.error);assert.equal(off.unit,unit);assert.equal(off.inventory,inventory);
  const drop=addInventoryItem(inventory,item('drop'));assert.ok(drop.error);assert.equal(drop.inventory,inventory);
});
test('wearing empties a slot then unequipping fills the hole and removes bonuses',()=>{
  const unit=hero(),staff={...DIVINE_EQUIPMENT.staff,uid:'staff',bagSlot:3};
  const equipped=equipFromInventory(unit,[staff],'staff');assert.equal(heroPersonalPower(equipped.unit),265);assert.equal(equipped.inventory.length,0);
  const off=unequipToInventory(equipped.unit,equipped.inventory,'weapon');assert.equal(heroPersonalPower(off.unit),145);assert.equal(off.inventory[0].bagSlot,0);
});
test('two rings remain independent and no UID duplicates after many exchanges',()=>{
  const unit=hero();let current=unit,inventory=[item('r1',0,'ring'),item('r2',1,'ring')];
  for(const id of ['r1','r2']){const next=equipFromInventory(current,inventory,id);current=next.unit;inventory=next.inventory;}
  assert.equal(current.equip.ring1.uid,'r1');assert.equal(current.equip.ring2.uid,'r2');
  for(let n=0;n<30;n++){const off=unequipToInventory(current,inventory,'ring1');const on=equipFromInventory(off.unit,off.inventory,'r1','ring1');current=on.unit;inventory=on.inventory;}
  assert.equal(inventory.length,0);assert.equal(current.equip.ring2.uid,'r2');
});
test('50 percent boundary and all four equal drop intervals are supported',()=>{
  assert.equal(rollInventoryLoot(()=>0.5),null);assert.equal(rollInventoryLoot(()=>0.999),null);
  for(const [index,key] of ['staff','armor','helmet','boots'].entries()){
    const samples=[0.49999,(index+0.5)/4];assert.equal(rollInventoryLoot(()=>samples.shift()),key);
  }
  assert.deepEqual(DIVINE_EQUIPMENT.helmet.bonus,{str:0,agi:10,vit:30,intel:0});
  assert.deepEqual(DIVINE_EQUIPMENT.boots.bonus,{str:15,agi:40,vit:0,intel:0});
});
test('game simulation always grants XP and grid controls target hero not selected merc',()=>{
  const source=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
  assert.match(source,/hero:grantXp\(previous.hero,100\),inventory:pickup.inventory/);
  assert.match(source,/equipItem\(itemUid,undefined,'hero'\)/);assert.match(source,/unequipItem\(slot,'hero'\)/);
  assert.match(source,/inventory:positionInventory\(next.inventory\)/);
  assert.doesNotMatch(source,/toggleHeroDivine/);
});
