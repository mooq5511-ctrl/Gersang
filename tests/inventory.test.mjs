import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {positionInventory,inventoryGrid,addInventoryItem} from '../app/inventory-layout.ts';
import {emptyEquipmentSlots,equipFromInventory,unequipToInventory} from '../app/equipment-slots.ts';
import {rollInventoryLoot} from '../app/inventory-loot.ts';
import {DIVINE_EQUIPMENT} from '../app/divine-equipment.ts';
import {heroPersonalPower,HERO_INITIAL_ATTRIBUTES} from '../app/hero-rules.ts';
import {normalizeVitals,vitalStats} from '../app/vitals-engine.ts';
const progressionSource=readFileSync(new URL('../app/game-progression.ts',import.meta.url),'utf8');
const progressionCode=progressionSource.slice(progressionSource.indexOf('export function grantXp'),progressionSource.indexOf('export function grantTerritoryXp')).replace(/^export /gm,'');
const progression=vm.createContext({vitalStats,xpNeed:()=>100,LEVEL_CAP:300});
vm.runInContext(ts.transpileModule(progressionCode,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,progression);
const actionSource=readFileSync(new URL('../app/game-inventory-actions.ts',import.meta.url),'utf8');
const actionCode=actionSource.slice(actionSource.indexOf('export function equipInventoryItemAction'),actionSource.indexOf('type GrantXp =')) .replace(/^export /gm,'');
const actions=vm.createContext({equipFromInventory,unequipToInventory,normalizeVitals,addLog:(logs,message)=>[message,...logs]});
vm.runInContext(ts.transpileModule(actionCode,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,actions);
const item=(id,bagSlot,slot='weapon')=>({uid:id,bagSlot,slot});
const hero=()=>({...HERO_INITIAL_ATTRIBUTES,level:1,equip:emptyEquipmentSlots()});
test('list mode compacts old holes and appends new drops',()=>{
  let inventory=positionInventory([item('a'),item('b'),item('c')]);
  inventory=inventory.filter(x=>x.uid!=='b');
  const grid=inventoryGrid(inventory);assert.equal(grid.slots.length,2);assert.equal(grid.slots[1].uid,'c');
  const next=addInventoryItem(inventory,item('drop'));assert.equal(next.inventory.find(x=>x.uid==='drop').bagSlot,2);
});
test('unlimited list preserves old overflow and accepts more items',()=>{
  const items=Array.from({length:25},(_,i)=>item(String(i)));
  const migrated=positionInventory(items);assert.equal(migrated.length,25);assert.equal(inventoryGrid(migrated).overflow.length,0);
  assert.deepEqual(positionInventory(JSON.parse(JSON.stringify(migrated))),migrated);
  const added=addInventoryItem(migrated,item('new'));assert.equal(added.error,undefined);assert.equal(added.inventory.length,26);
});
test('invalid or duplicate positions are repaired without losing any unique item',()=>{
  const fixed=positionInventory([item('a',0),item('b',0),item('c',999),item('d',-1)]);
  assert.deepEqual(fixed.map(x=>x.bagSlot),[0,1,2,3]);
});
test('large inventory still exchanges equipment without losing items',()=>{
  const inventory=positionInventory(Array.from({length:200},(_,i)=>item('bag-'+i)));
  const unit=hero();unit.equip.weapon=item('old',19);
  const result=equipFromInventory(unit,inventory,'bag-7');
  assert.equal(result.error,undefined);assert.equal(result.inventory.length,200);
  assert.equal(result.unit.equip.weapon.uid,'bag-7');assert.ok(result.inventory.some(x=>x.uid==='old'));
});
test('unlimited bag accepts unequip and incoming loot at any size',()=>{
  const inventory=positionInventory(Array.from({length:200},(_,i)=>item('bag-'+i)));
  const unit=hero();unit.equip.weapon=item('worn');
  const off=unequipToInventory(unit,inventory,'weapon');assert.equal(off.error,undefined);assert.equal(off.inventory.length,201);
  const drop=addInventoryItem(inventory,item('drop'));assert.equal(drop.error,undefined);assert.equal(drop.inventory.length,201);
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
test('XP awards level the hero and inventory actions honor their explicit target',()=>{
  const gameHero={uid:'hero',templateId:'hero',level:1,xp:0,points:0,vit:20,intel:10,maxHp:100,hp:80,mp:40,equip:emptyEquipmentSlots()};
  const leveled=progression.grantXp(gameHero,100);
  assert.equal(leveled.level,gameHero.level+1);
  const gear={...DIVINE_EQUIPMENT.staff,uid:'hero-staff',bagSlot:0};
  const game={hero:gameHero,mercs:[],inventory:[gear],logs:[]};
  const heroEquipped=actions.equipInventoryItemAction(game,gear.uid,undefined,'hero',actions.addLog);
  assert.equal(heroEquipped.hero.equip.weapon.uid,gear.uid);
  const merc={...gameHero,uid:'merc-test',templateId:'merchant-spear',name:'測試傭兵'};
  game.mercs=[merc];
  const mercEquipped=actions.equipInventoryItemAction(game,gear.uid,undefined,merc.uid,actions.addLog);
  assert.equal(mercEquipped.mercs[0].equip.weapon.uid,gear.uid);
  assert.equal(mercEquipped.hero.equip.weapon,null);
  const removed=actions.unequipInventoryItemAction(mercEquipped,'weapon',merc.uid,actions.addLog);
  assert.equal(removed.mercs[0].equip.weapon,null);
  assert.equal(removed.inventory[0].uid,gear.uid);
});
